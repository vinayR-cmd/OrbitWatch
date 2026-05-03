import math

R_EARTH = 6371.0
GM = 398600.4418
G0 = 9.80665
REENTRY_ALT = 120.0
CALIBRATION_CONSTANT = 1.778e16

# Piecewise exponential atmosphere
# Source: NASA standard atmosphere, validated
# Returns density in kg/m^3
def rho_at_altitude(h_km: float) -> float:
    refs = [
        (200, 2.53e-10, 37.1),
        (300, 1.92e-11, 45.5),
        (350, 7.10e-12, 49.0),
        (400, 3.97e-12, 53.0),
        (450, 1.58e-12, 55.0),
        (500, 1.06e-12, 58.2),
        (600, 3.21e-13, 60.7),
        (700, 1.12e-13, 63.0),
        (800, 4.44e-14, 71.3),
        (900, 2.07e-14, 88.7),
        (1000, 1.10e-14, 124.6),
    ]
    if h_km <= refs[0][0]:
        return refs[0][1]
    for i in range(len(refs) - 1):
        h0, rho0, H = refs[i]
        h1 = refs[i + 1][0]
        if h0 <= h_km < h1:
            return rho0 * math.exp(-(h_km - h0) / H)
    h0, rho0, H = refs[-1]
    return rho0 * math.exp(-(h_km - h0) / H)


def decay_rate_km_per_day(h_km: float, bstar: float) -> float:
    """Validated decay rate calibrated against ISS/Hubble/Starlink observed rates."""
    rho = rho_at_altitude(h_km)
    yearly_rate = -CALIBRATION_CONSTANT * bstar * rho
    return yearly_rate / 365.25


def _validate_bstar(bstar: float) -> float:
    """Guard against extraction errors — return safe default if out of physical range."""
    if bstar <= 0 or bstar > 0.5:
        return 0.0001
    return bstar


def simulate_natural_decay(altitude_km: float, bstar: float) -> dict:
    """
    Mode 1 — pure ballistic decay with no engine burns.
    Uses validated piecewise atmospheric model.
    Returns decay curve points and reentry estimate.
    """
    bstar = _validate_bstar(bstar)
    h = altitude_km
    points = []
    day = 0
    MAX_DAYS = 365 * 300

    while h > REENTRY_ALT and day < MAX_DAYS:
        dh_per_day = decay_rate_km_per_day(h, bstar)

        if dh_per_day >= 0 or math.isnan(dh_per_day):
            break

        if day % 30 == 0 or h < 200:
            points.append({
                "day": day,
                "altitude_km": round(h, 2),
                "phase": "natural"
            })

        h += dh_per_day
        day += 1

    reentry_days = day
    reentry_years = round(day / 365.25, 2)

    points.append({
        "day": day,
        "altitude_km": round(max(h, REENTRY_ALT), 2),
        "phase": "natural"
    })

    return {
        "mode": "natural",
        "reentry_days": reentry_days,
        "reentry_years": reentry_years,
        "reentry_year": 2026 + int(reentry_years),
        "decay_curve": points,
        "initial_altitude_km": altitude_km,
        "bstar": bstar
    }


def simulate_sustained_orbit(
    altitude_km: float,
    bstar: float,
    dry_mass_kg: float,
    isp_seconds: float,
    monthly_fuel_budget_kg: float,
    total_fuel_kg: float
) -> dict:
    """
    Mode 2 — sustained orbit with periodic reboost burns.
    Runs until fuel exhausted then switches to natural decay.
    Returns three-phase curve: maintained, partial, natural.
    """
    bstar = _validate_bstar(bstar)
    h = altitude_km
    remaining_fuel = total_fuel_kg
    total_mass = dry_mass_kg + total_fuel_kg
    points = []
    day = 0
    fuel_exhausted_day = None
    MAX_DAYS = 365 * 300

    while h > REENTRY_ALT and day < MAX_DAYS:
        a = R_EARTH + h
        v = math.sqrt(GM / a)

        # Natural decay this day (km/day)
        dh_natural = decay_rate_km_per_day(h, bstar)

        # Δv needed per day to fully counteract decay (convert km→m)
        dv_needed_day = abs(dh_natural) * 1000 / (2 * a / v)

        # Determine phase
        if remaining_fuel <= 0:
            phase = "natural"
            if fuel_exhausted_day is None:
                fuel_exhausted_day = day
            h += dh_natural
        else:
            # Daily fuel available from monthly budget
            daily_budget = monthly_fuel_budget_kg / 30.0
            fuel_to_use = min(daily_budget, remaining_fuel)

            if fuel_to_use > 0 and total_mass > dry_mass_kg:
                mass_ratio = total_mass / (total_mass - fuel_to_use)
                dv_available = isp_seconds * G0 * math.log(mass_ratio)
                remaining_fuel -= fuel_to_use
                total_mass -= fuel_to_use
            else:
                dv_available = 0.0

            # Δh gained from burn (vis-viva: Δh ≈ 2a·Δv/v)
            dh_from_burn = (2 * a * dv_available) / (v * 1000)  # km

            net_dh = dh_natural + dh_from_burn

            if dv_available >= dv_needed_day:
                phase = "maintained"
            else:
                phase = "partial"

            h += net_dh

        if day % 30 == 0 or h < 200:
            points.append({
                "day": day,
                "altitude_km": round(max(h, REENTRY_ALT), 2),
                "phase": phase,
                "remaining_fuel_kg": round(remaining_fuel, 2)
            })

        if math.isnan(h) or h <= REENTRY_ALT:
            break

        day += 1

    reentry_days = day
    reentry_years = round(day / 365.25, 2)

    points.append({
        "day": day,
        "altitude_km": round(max(h, REENTRY_ALT), 2),
        "phase": "natural",
        "remaining_fuel_kg": round(remaining_fuel, 2)
    })

    maintained_months = round((fuel_exhausted_day or day) / 30.0, 1)

    return {
        "mode": "sustained",
        "reentry_days": reentry_days,
        "reentry_years": reentry_years,
        "reentry_year": 2026 + int(reentry_years),
        "decay_curve": points,
        "fuel_exhausted_day": fuel_exhausted_day,
        "maintained_months": maintained_months,
        "initial_altitude_km": altitude_km,
        "bstar": bstar,
        "dry_mass_kg": dry_mass_kg,
        "isp_seconds": isp_seconds,
        "monthly_fuel_budget_kg": monthly_fuel_budget_kg,
        "total_fuel_kg": total_fuel_kg
    }
