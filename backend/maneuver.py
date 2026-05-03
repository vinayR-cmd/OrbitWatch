import math

def calculate_fuel_cost(
    delta_v_ms: float,
    dry_mass_kg: float,
    isp_seconds: float,
    current_fuel_kg: float = None
) -> dict:
    g0 = 9.80665
    exponent = delta_v_ms / (isp_seconds * g0)
    fuel_burned_kg = dry_mass_kg * (math.exp(exponent) - 1)
    
    result = {
        "delta_v_ms": round(delta_v_ms, 4),
        "fuel_burned_kg": round(fuel_burned_kg, 4),
        "dry_mass_kg": dry_mass_kg,
        "isp_seconds": isp_seconds,
        "exponent_check": round(exponent, 6),
    }
    
    if current_fuel_kg is not None:
        remaining = current_fuel_kg - fuel_burned_kg
        result["current_fuel_kg"] = current_fuel_kg
        result["remaining_fuel_kg"] = round(remaining, 4)
        result["fuel_remaining_pct"] = round(
            (remaining / current_fuel_kg) * 100, 1
        )
        result["sufficient_fuel"] = remaining >= 0
        if remaining < 0:
            result["fuel_deficit_kg"] = round(abs(remaining), 4)
    
    return result
