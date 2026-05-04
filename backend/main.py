from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
from datetime import datetime, timezone
from sgp4.api import WGS84, Satrec
from dotenv import load_dotenv

import os

# Load from project root — not from backend/ subfolder
_ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_ROOT_DIR, '.env'))

ALLOWED_ORIGINS = os.getenv(
    'ALLOWED_ORIGINS',
    'http://localhost:5173,http://localhost:3000'
).split(',')

# Absolute imports inside the backend folder
from .predict import is_model_loaded
from .cache import tle_cache
from .fetch import fetch_tle_by_norad, fetch_shell_tles, fetch_tle_history_by_norad
from .propagate import propagate_to_now, tle_to_satrec, extract_features, generate_synthetic_tle
from .conjunction import screen_candidates, find_conjunctions
from .maneuver import calculate_fuel_cost as calc_fuel
from .decay import simulate_natural_decay, simulate_sustained_orbit

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: load model
    loaded = is_model_loaded()
    print(f"[startup] OrbitalTransformer loaded: {loaded}")
    yield
    print("Shutting down Space Debris API...")

app = FastAPI(title="Space Debris API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

class NoradRequest(BaseModel):
    norad_id: int

class PrelaunchRequest(BaseModel):
    mission_name: str
    apogee_km: float
    perigee_km: float
    inclination_deg: float
    launch_time: str
    raan_deg: float = 0.0
    arg_perigee_deg: float = 0.0
    mean_anomaly_deg: float = 0.0
    bstar: float = 0.0001

class ManeuverFuelRequest(BaseModel):
    delta_v_ms: float
    dry_mass_kg: float
    isp_seconds: float = 220.0
    current_fuel_kg: float = None

@app.post("/api/maneuver/fuel-cost")
def maneuver_fuel_cost(req: ManeuverFuelRequest):
    return calc_fuel(
        req.delta_v_ms,
        req.dry_mass_kg,
        req.isp_seconds,
        req.current_fuel_kg
    )

class NaturalDecayRequest(BaseModel):
    altitude_km: float
    bstar: float

class SustainedOrbitRequest(BaseModel):
    altitude_km: float
    bstar: float
    dry_mass_kg: float
    isp_seconds: float = 220.0
    monthly_fuel_budget_kg: float
    total_fuel_kg: float

@app.post("/api/decay/natural")
def natural_decay(req: NaturalDecayRequest):
    return simulate_natural_decay(req.altitude_km, req.bstar)

@app.post("/api/decay/sustained")
def sustained_orbit(req: SustainedOrbitRequest):
    return simulate_sustained_orbit(
        req.altitude_km, req.bstar,
        req.dry_mass_kg, req.isp_seconds,
        req.monthly_fuel_budget_kg, req.total_fuel_kg
    )

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": is_model_loaded(),
        "sgp4_fallback": True
    }

@app.get("/api/objects/shell")
def get_shell(altitude_km: float, inclination_deg: float):
    cache_key = tle_cache.make_key(altitude_km, inclination_deg)
    shell_tles = tle_cache.get(cache_key)
    
    if not shell_tles:
        shell_tles = fetch_shell_tles(altitude_km, inclination_deg)
        if shell_tles:
            tle_cache.set(cache_key, shell_tles)
            
    return {
        "count": len(shell_tles) if shell_tles else 0,
        "objects": shell_tles
    }

def analyze_logic(mission_tle: dict, tle_history_map: dict = None) -> dict:
    satrec = tle_to_satrec(mission_tle["line1"], mission_tle["line2"])
    pos = propagate_to_now(satrec)
    if not pos:
        raise HTTPException(status_code=400, detail="Failed to propagate mission satellite")
        
    feat = extract_features(mission_tle["line1"], mission_tle["line2"])
    inclination_deg = feat[0] * 57.2958 # rad to deg
    
    # Calculate approximate altitude from mean motion or simply by position magnitude - earth radius
    r_mag = (pos["x_km"]**2 + pos["y_km"]**2 + pos["z_km"]**2)**0.5
    earth_r = 6371.0
    altitude_km = r_mag - earth_r
    
    orbit_path = mission_tle.get("orbit_path_override")
    apogee_point = mission_tle.get("apogee_override")
    perigee_point = mission_tle.get("perigee_override")

    if not orbit_path:
        orbit_path = []
        try:
            from datetime import timedelta
            # feat[5] is mean motion in rad/min
            mean_motion_rad_min = feat[5]
            if mean_motion_rad_min > 0:
                period_minutes = (2 * 3.1415926535) / mean_motion_rad_min
            else:
                period_minutes = 90.0 # fallback
            
            num_pts = 360
            step_minutes = period_minutes / num_pts
            now_time = datetime.now(timezone.utc)
            
            from .propagate import propagate_at
            for i in range(num_pts):
                dt = now_time + timedelta(minutes=i * step_minutes)
                # Snapshot method: rotate all points using the current time so they align
                pt = propagate_at(satrec, dt, snapshot_dt=now_time)
                if pt:
                    orbit_path.append({'x': pt['x_km'], 'y': pt['y_km'], 'z': pt['z_km']})
                    
            if orbit_path:
                magnitudes = [(p['x']**2 + p['y']**2 + p['z']**2)**0.5 for p in orbit_path]
                max_idx = magnitudes.index(max(magnitudes))
                min_idx = magnitudes.index(min(magnitudes))
                apogee_point = {
                    'x': orbit_path[max_idx]['x'], 'y': orbit_path[max_idx]['y'], 'z': orbit_path[max_idx]['z'],
                    'altitude_km': max(magnitudes) - earth_r
                }
                perigee_point = {
                    'x': orbit_path[min_idx]['x'], 'y': orbit_path[min_idx]['y'], 'z': orbit_path[min_idx]['z'],
                    'altitude_km': min(magnitudes) - earth_r
                }
            else:
                apogee_point = {'x': 0, 'y': 0, 'z': 0, 'altitude_km': altitude_km}
                perigee_point = {'x': 0, 'y': 0, 'z': 0, 'altitude_km': altitude_km}
        except Exception as e:
            print(f"Error generating orbit path: {e}")
            apogee_point = {'x': 0, 'y': 0, 'z': 0, 'altitude_km': altitude_km}
            perigee_point = {'x': 0, 'y': 0, 'z': 0, 'altitude_km': altitude_km}
            orbit_path = []
            
    apogee_km = apogee_point['altitude_km']
    perigee_km = perigee_point['altitude_km']
    
    # Check cache for shell using PERIGEE to accurately capture the densest part of elliptical orbits
    cache_key = tle_cache.make_key(perigee_km, inclination_deg)
    shell_tles = tle_cache.get(cache_key)
    if not shell_tles:
        shell_tles = fetch_shell_tles(perigee_km, inclination_deg)
        if shell_tles:
            tle_cache.set(cache_key, shell_tles)
            
    if not shell_tles:
        shell_tles = []
        
    # Propagate all to now and format
    all_objects = []
    for t in shell_tles:
        try:
            s_rec = tle_to_satrec(t["line1"], t["line2"])
            s_pos = propagate_to_now(s_rec)
            if s_pos:
                obj_data = t.copy()
                obj_data.update(s_pos)
                all_objects.append(obj_data)
        except Exception:
            continue
            
    # KDTree screen (evaluate objects within 500km range for conjunction risk)
    candidates = screen_candidates(pos, all_objects, radius_km=500.0)
    
    # Fallback for highly elliptical orbits (like Vanguard 1 at apogee)
    # If no debris is currently within 500km, grab the 50 closest objects globally from the shell
    if len(candidates) < 5 and all_objects:
        def sq_dist(obj):
            return (obj["x_km"] - pos["x_km"])**2 + (obj["y_km"] - pos["y_km"])**2 + (obj["z_km"] - pos["z_km"])**2
        all_objects_sorted = sorted(all_objects, key=sq_dist)
        candidates = all_objects_sorted[:50]
    
    # find conjunctions
    conjunctions = find_conjunctions(mission_tle, candidates, hours=72, tle_history_map=tle_history_map)
    
    high_risk_count = sum(1 for c in conjunctions if c["action"] == "MANEUVER")
    next_tca = conjunctions[0]["tca_time"] if conjunctions else None
    
    # Calculate density bands
    bands = [
        {"label": "200-400", "count": 0, "fill": "#1e88e5"},
        {"label": "400-600", "count": 0, "fill": "#ff6d00"},
        {"label": "600-800", "count": 0, "fill": "#f44336"},
        {"label": "800-1000", "count": 0, "fill": "#f44336"},
        {"label": "1000-1200", "count": 0, "fill": "#1e88e5"},
        {"label": "1200+", "count": 0, "fill": "#1e88e5"},
    ]
    
    for obj in all_objects:
        try:
            r_obj = (obj["x_km"]**2 + obj["y_km"]**2 + obj["z_km"]**2)**0.5
            h_obj = r_obj - earth_r
            if 200 <= h_obj < 400: bands[0]["count"] += 1
            elif 400 <= h_obj < 600: bands[1]["count"] += 1
            elif 600 <= h_obj < 800: bands[2]["count"] += 1
            elif 800 <= h_obj < 1000: bands[3]["count"] += 1
            elif 1000 <= h_obj < 1200: bands[4]["count"] += 1
            elif h_obj >= 1200: bands[5]["count"] += 1
        except Exception:
            continue
    
    return {
        "mission": {
            "name": mission_tle.get("name"),
            "norad_id": mission_tle.get("norad_id", 0),
            "altitude_km": altitude_km,
            "apogee_km": apogee_km,
            "perigee_km": perigee_km,
            "inclination_deg": inclination_deg,
            "position": pos,
            "orbit_path": orbit_path,
            "apogee_point": apogee_point,
            "perigee_point": perigee_point,
            "bstar": feat[6]
        },
        "conjunctions": conjunctions,
        "summary": {
            "total_screened": len(all_objects),
            "candidates": len(candidates),
            "high_risk_count": high_risk_count,
            "next_tca": next_tca,
            "density_bands": bands
        }
    }

@app.post("/api/analyze/norad")
def analyze_norad(req: NoradRequest):
    tle = fetch_tle_by_norad(req.norad_id)
    if not tle:
        raise HTTPException(
            status_code=503,
            detail="Space-Track API unavailable — try again later"
        )
        
    tle_history_map = None
    if is_model_loaded():
        hist = fetch_tle_history_by_norad(req.norad_id)
        if hist:
            tle_history_map = {req.norad_id: hist}
            
    return analyze_logic(tle, tle_history_map=tle_history_map)

@app.post("/api/analyze/prelaunch")
def analyze_prelaunch(req: PrelaunchRequest):
    if req.perigee_km < 200:
        raise HTTPException(status_code=400, detail="Perigee below 200km — satellite deorbits within hours")
    if req.apogee_km < req.perigee_km:
        raise HTTPException(status_code=400, detail="Apogee must be greater than or equal to perigee")
    if req.apogee_km > 50000:
        raise HTTPException(status_code=400, detail="Apogee above 50,000km is outside supported range")
        
    line1, line2, orbit_path, apogee_point, perigee_point = generate_synthetic_tle(
        req.apogee_km, req.perigee_km, req.inclination_deg,
        req.raan_deg, req.arg_perigee_deg, req.mean_anomaly_deg, req.bstar, req.launch_time
    )
    
    tle = {
        "name": req.mission_name,
        "norad_id": 99999,
        "line1": line1,
        "line2": line2,
        "orbit_path_override": orbit_path,
        "apogee_override": apogee_point,
        "perigee_override": perigee_point
    }
    
    try:
        return analyze_logic(tle, tle_history_map=None)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.websocket("/ws/live/{norad_id}")
async def live_analysis(websocket: WebSocket, norad_id: int):
    await websocket.accept()
    
    try:
        while True:
            # Re-fetch latest to get any slight tweaks
            tle = fetch_tle_by_norad(norad_id)
            if tle:
                # Run heavy CPU logic in a thread so the WebSocket ping/pong stays alive
                result = await asyncio.to_thread(analyze_logic, tle, None)
                await websocket.send_json(result)
            else:
                await websocket.send_json({"error": "Failed to fetch live TLE"})
                
            await asyncio.sleep(60)
            
    except WebSocketDisconnect:
        pass
    except RuntimeError as e:
        if "close message" not in str(e):
            print(f"WS Runtime error: {e}")
    except Exception as e:
        print(f"WS error: {e}")
        try:
            await websocket.close()
        except:
            pass
