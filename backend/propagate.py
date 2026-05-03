from datetime import datetime, timezone
import math
import numpy as np
from scipy.integrate import solve_ivp
from sgp4.api import Satrec, jday

def tle_to_satrec(line1: str, line2: str) -> Satrec:
    """Parse TLE lines into a Satrec object."""
    return Satrec.twoline2rv(line1, line2)

def teme_to_ecef(r, dt: datetime):
    """Convert TEME (SGP4 ECI) to ECEF for CesiumJS Globe rendering."""
    jd, fr = jday(dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second + dt.microsecond / 1e6)
    t = (jd + fr - 2451545.0) / 36525.0
    gmst_sec = 67310.54841 + (876600.0 * 3600 + 8640184.812866) * t + 0.093104 * t**2 - 6.2e-6 * t**3
    gmst = ((gmst_sec % 86400.0) / 86400.0) * 2 * math.pi
    cos_g = math.cos(gmst)
    sin_g = math.sin(gmst)
    return (r[0] * cos_g + r[1] * sin_g, -r[0] * sin_g + r[1] * cos_g, r[2])

def propagate_at(satrec: Satrec, dt: datetime, snapshot_dt: datetime = None) -> dict | None:
    """Propagate to a specific UTC datetime. Return {x_km, ...} or None."""
    # Ensure dt is timezone unaware or handling UTC properly. 
    # jday takes (year, month, day, hour, minute, second)
    jd, fr = jday(dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second + dt.microsecond / 1e6)
    e, r, v = satrec.sgp4(jd, fr)
    
    if e != 0:
        return None
        
    r_ecef = teme_to_ecef(r, snapshot_dt if snapshot_dt else dt)
        
    return {
        "x_km": r_ecef[0],
        "y_km": r_ecef[1],
        "z_km": r_ecef[2],
        "vx": v[0],
        "vy": v[1],
        "vz": v[2],
        "dt": dt.isoformat()
    }

def propagate_to_now(satrec: Satrec) -> dict | None:
    """Propagate to current UTC time."""
    now = datetime.now(timezone.utc)
    return propagate_at(satrec, now)

def extract_features(tle_line1: str, tle_line2: str) -> list[float]:
    """Extract 7 features: [inclination, eccentricity, raan, arg_perigee, 
    mean_anomaly, mean_motion, bstar] from TLE lines."""
    try:
        sat = Satrec.twoline2rv(tle_line1, tle_line2)
        return [
            sat.inclo,
            sat.ecco,
            sat.nodeo,
            sat.argpo,
            sat.mo,
            sat.no_kozai,
            sat.bstar
        ]
    except Exception:
        # Fallback list of 0s if something is badly malformed
        return [0.0] * 7

def rk45_propagate_orbit(apogee_km: float, perigee_km: float, inclination_deg: float, 
                         raan_deg: float, arg_perigee_deg: float, mean_anomaly_deg: float, 
                         bstar: float, epoch_time: str = None):
    R_earth = 6371.0
    GM = 398600.4418
    J2 = 1.08263e-3
    J3 = -2.53265e-6
    rho0 = 1.225e-12
    H = 8.5

    if epoch_time:
        try:
            dt = datetime.fromisoformat(epoch_time.replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            dt = datetime.now(timezone.utc)
    else:
        dt = datetime.now(timezone.utc)

    # 1. Orbital Elements to ECI State Vector
    a = (R_earth + apogee_km + R_earth + perigee_km) / 2
    e = (apogee_km - perigee_km) / (apogee_km + perigee_km + 2 * R_earth)
    
    inc = inclination_deg * math.pi / 180
    raan = raan_deg * math.pi / 180
    argp = arg_perigee_deg * math.pi / 180
    M = mean_anomaly_deg * math.pi / 180

    # Newton-Raphson to solve M = E - e*sin(E)
    E_val = M  # initial guess
    for _ in range(100):
        E_val = E_val - (E_val - e * math.sin(E_val) - M) / (1 - e * math.cos(E_val))
        
    # True anomaly from eccentric anomaly
    nu = 2 * math.atan2(
        math.sqrt(1 + e) * math.sin(E_val / 2),
        math.sqrt(1 - e) * math.cos(E_val / 2)
    )

    # Position in perifocal frame
    p = a * (1 - e**2)
    r_peri = p / (1 + e * math.cos(nu))
    
    P_pos = np.array([
        r_peri * math.cos(nu),
        r_peri * math.sin(nu),
        0.0
    ])
    
    # Velocity in perifocal frame
    sqrt_gmp = math.sqrt(GM / p)
    P_vel = np.array([
        -sqrt_gmp * math.sin(nu),
        sqrt_gmp * (e + math.cos(nu)),
        0.0
    ])
    
    # Rotation Matrix from Perifocal to ECI
    def Rz(theta):
        return np.array([
            [ math.cos(theta), -math.sin(theta), 0],
            [ math.sin(theta),  math.cos(theta), 0],
            [ 0,                0,               1]
        ])
                         
    def Rx(theta):
        return np.array([
            [1,  0,               0              ],
            [0,  math.cos(theta), -math.sin(theta)],
            [0,  math.sin(theta),  math.cos(theta)]
        ])
                         
    Q = Rz(-raan) @ Rx(-inc) @ Rz(-argp)
    r_eci = Q @ P_pos
    v_eci = Q @ P_vel
    
    state0 = [r_eci[0], r_eci[1], r_eci[2], v_eci[0], v_eci[1], v_eci[2]]

    # 2. Define ODE for RK45
    def equations_of_motion(t, state):
        x, y, z, vx, vy, vz = state
        r = math.sqrt(x**2 + y**2 + z**2)
        r2 = r**2
        r3 = r**3
        r5 = r**5
        r7 = r**7
        
        # Point Mass Gravity
        ax_g = -GM * x / r3
        ay_g = -GM * y / r3
        az_g = -GM * z / r3
        
        # J2 Perturbation
        factor_j2 = 1.5 * J2 * GM * (R_earth**2) / r5
        ax_j2 = factor_j2 * x * (5 * z**2 / r2 - 1)
        ay_j2 = factor_j2 * y * (5 * z**2 / r2 - 1)
        az_j2 = factor_j2 * z * (5 * z**2 / r2 - 3)
        
        # J3 Perturbation
        factor_j3 = 2.5 * J3 * GM * (R_earth**3) / r7
        ax_j3 = factor_j3 * x * (3 * z - 7 * z**3 / r2)
        ay_j3 = factor_j3 * y * (3 * z - 7 * z**3 / r2)
        az_j3 = factor_j3 * (6 * z**2 - 7 * z**4 / r2 - 3 * r2 / 5)
        
        # Atmospheric Drag
        rho = rho0 * math.exp(-(r - R_earth) / H)
        v_rel = np.array([vx, vy, vz])
        v_mag = np.linalg.norm(v_rel)
        a_drag = -bstar * rho * v_mag * v_rel
        
        return [
            vx, vy, vz,
            ax_g + ax_j2 + ax_j3 + a_drag[0],
            ay_g + ay_j2 + ay_j3 + a_drag[1],
            az_g + az_j2 + az_j3 + a_drag[2]
        ]

    # 3. Integrate over 1.02x Keplerian period to find closure point
    period_s = 2 * math.pi * math.sqrt((a**3) / GM)
    t_span_extended = (0, period_s * 1.02)
    t_eval_extended = np.linspace(0, period_s * 1.02, 500)
    
    sol = solve_ivp(equations_of_motion, t_span_extended, state0,
                    method='RK45', t_eval=t_eval_extended,
                    rtol=1e-9, atol=1e-9)
                    
    # Find the actual closure point
    start_pos = np.array([sol.y[0][0], sol.y[1][0], sol.y[2][0]])
    min_gap = float('inf')
    closure_idx = len(t_eval_extended) - 1
    
    search_start = int(0.80 * len(t_eval_extended))
    for i in range(search_start, len(t_eval_extended)):
        pos_i = np.array([sol.y[0][i], sol.y[1][i], sol.y[2][i]])
        gap = np.linalg.norm(pos_i - start_pos)
        if gap < min_gap:
            min_gap = gap
            closure_idx = i
    
    # 4. Transform ECI to ECEF and prepare output
    indices = np.linspace(0, closure_idx, 360).astype(int)
    
    positions_ecef = []
    magnitudes = []
    for i in indices:
        r_eci_pt = [sol.y[0][i], sol.y[1][i], sol.y[2][i]]
        # Snapshot methodology: rotate using fixed epoch dt (as user requested)
        r_ecef_pt = teme_to_ecef(r_eci_pt, dt)
        positions_ecef.append({'x': r_ecef_pt[0], 'y': r_ecef_pt[1], 'z': r_ecef_pt[2]})
        magnitudes.append(math.sqrt(r_eci_pt[0]**2 + r_eci_pt[1]**2 + r_eci_pt[2]**2))
        
    # 5. Determine Apogee and Perigee
    max_idx = np.argmax(magnitudes)
    min_idx = np.argmin(magnitudes)
    
    apogee_point = {
        'x': positions_ecef[max_idx]['x'], 'y': positions_ecef[max_idx]['y'], 'z': positions_ecef[max_idx]['z'],
        'altitude_km': magnitudes[max_idx] - R_earth
    }
    perigee_point = {
        'x': positions_ecef[min_idx]['x'], 'y': positions_ecef[min_idx]['y'], 'z': positions_ecef[min_idx]['z'],
        'altitude_km': magnitudes[min_idx] - R_earth
    }
    
    return positions_ecef, apogee_point, perigee_point

def generate_synthetic_tle(
    apogee_km: float, perigee_km: float, inclination_deg: float,
    raan_deg: float=0.0, arg_perigee_deg: float=0.0,
    mean_anomaly_deg: float=0.0, bstar: float=0.0001, epoch_time: str=None
):
    R_earth = 6371.0
    GM = 398600.4418

    ra = R_earth + apogee_km
    rp = R_earth + perigee_km
    a = (ra + rp) / 2
    e = (ra - rp) / (ra + rp)

    period_s = 2 * math.pi * math.sqrt((a**3) / GM)
    mean_motion_rev_per_day = 86400.0 / period_s

    if epoch_time:
        try:
            dt = datetime.fromisoformat(epoch_time.replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            dt = datetime.now(timezone.utc)
    else:
        dt = datetime.now(timezone.utc)
        
    epoch_year = dt.year % 100
    start_of_year = datetime(dt.year, 1, 1, tzinfo=timezone.utc)
    day_of_year = (dt - start_of_year).total_seconds() / 86400.0 + 1.0

    line1 = f"1 99999U 26999A   {epoch_year:02d}{day_of_year:012.8f}  .00000000  00000-0  00000-0 0  9997"
    
    ecc_str = f"{int(e * 1e7):07d}"
    inc_str = f"{inclination_deg:8.4f}"
    raan_str = f"{raan_deg:8.4f}"
    arg_p_str = f"{arg_perigee_deg:8.4f}"
    m_anom_str = f"{mean_anomaly_deg:8.4f}"
    mm_str = f"{mean_motion_rev_per_day:11.8f}"
    
    line2 = f"2 99999 {inc_str} {raan_str} {ecc_str} {arg_p_str} {m_anom_str} {mm_str}000018"

    positions_ecef, apogee_point, perigee_point = rk45_propagate_orbit(
        apogee_km, perigee_km, inclination_deg, raan_deg, 
        arg_perigee_deg, mean_anomaly_deg, bstar, epoch_time
    )

    return line1, line2, positions_ecef, apogee_point, perigee_point

