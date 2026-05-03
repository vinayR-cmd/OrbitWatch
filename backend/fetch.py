import os
import time
from typing import List, Dict, Optional
from spacetrack import SpaceTrackClient
from dotenv import load_dotenv

# Load from project root — not from backend/ subfolder
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(ROOT_DIR, '.env'))

# Validate credentials on startup
if not os.getenv('SPACETRACK_USER') or not os.getenv('SPACETRACK_PASS'):
    print('[WARNING] SpaceTrack credentials missing from .env — live TLE fetching will be unavailable.')

import httpx


def validate_tle_object(obj: dict) -> dict:
    # Ensure B* is a valid float in reasonable range
    bstar = obj.get('bstar', 0.0001)
    try:
        bstar = float(bstar)
        if bstar <= 0 or bstar > 1.0 or bstar != bstar:
            bstar = 0.0001
    except (TypeError, ValueError):
        bstar = 0.0001
    obj['bstar'] = bstar

    # Ensure inclination is valid degrees
    inc = obj.get('inclination_deg', 0)
    try:
        inc = float(inc)
        if inc < 0 or inc > 180 or inc != inc:
            inc = 0.0
    except (TypeError, ValueError):
        inc = 0.0
    obj['inclination_deg'] = inc

    # Ensure altitude is positive
    for key in ['altitude_km', 'apogee_km', 'perigee_km']:
        val = obj.get(key)
        if val is not None:
            try:
                val = float(val)
                if val < 0 or val != val:
                    val = 400.0
                obj[key] = val
            except (TypeError, ValueError):
                obj[key] = 400.0

    return obj

def get_client() -> SpaceTrackClient | None:
    user = os.environ.get("SPACETRACK_USER")
    pw = os.environ.get("SPACETRACK_PASS")
    if not user or not pw:
        return None
    try:
        ht_client = httpx.Client(timeout=30, verify=True)
        return SpaceTrackClient(identity=user, password=pw, httpx_client=ht_client)
    except Exception as e:
        print(f"Auth Exception: {e}")
        return None

def fetch_tle_by_norad(norad_id: int) -> dict | None:
    """Fetch the latest TLE for a single satellite. Return {name, line1, line2, norad_id} or None."""
    client = get_client()
    if not client:
        print(f'[FETCH] No SpaceTrack client available — cannot fetch NORAD {norad_id}')
        return None

    try:
        data = client.gp(norad_cat_id=norad_id, format='json')
        if not data:
            print(f'[FETCH] No TLE found for NORAD {norad_id}')
            return None

        import json
        if isinstance(data, str):
            data = json.loads(data)

        record = data[0]
        return {
            "name": record.get("OBJECT_NAME", "UNKNOWN"),
            "line1": record.get("TLE_LINE1"),
            "line2": record.get("TLE_LINE2"),
            "norad_id": int(record.get("NORAD_CAT_ID", 0))
        }
    except Exception as e:
        print(f'[FETCH] API error for NORAD {norad_id}: {e}')
        return None

def fetch_tle_history_by_norad(norad_id: int) -> list[dict]:
    """Fetch the last 20 TLEs for a single satellite. Return list of dicts."""
    client = get_client()
    if not client:
        return []
    
    try:
        data = client.gp_history(norad_cat_id=norad_id, orderby='EPOCH desc', limit=20, format='json')
        if not data:
            return []
            
        import json
        if isinstance(data, str):
            data = json.loads(data)
            
        # If space-track ignored limit
        if len(data) > 20:
            data = data[:20]
            
        results = []
        for record in data:
            results.append({
                "inclination": float(record.get("INCLINATION", 0)),
                "eccentricity": float(record.get("ECCENTRICITY", 0)),
                "raan": float(record.get("RA_OF_ASC_NODE", 0)),
                "arg_perigee": float(record.get("ARG_OF_PERICENTER", 0)),
                "mean_anomaly": float(record.get("MEAN_ANOMALY", 0)),
                "mean_motion": float(record.get("MEAN_MOTION", 0)),
                "bstar": float(record.get("BSTAR", 0)),
                "epoch": record.get("EPOCH")
            })
        return results[::-1] # Reverse to get chronological order (oldest first)
    except Exception as e:
        print(f"Error fetching TLE history for norad_id {norad_id}: {e}")
        return []

def _fetch_by_shell(altitude_km: float, inclination_deg: float, object_type: str = None) -> list[dict]:
    """Helper to fetch shell with rate limiting pause."""
    client = get_client()
    if not client:
        return []
        
    inc_min = max(0.0, inclination_deg - 5.0)
    inc_max = inclination_deg + 5.0
    alt_min = max(0.0, altitude_km - 50.0)
    alt_max = altitude_km + 50.0
    
    inc_range = f"{inc_min}--{inc_max}"
    alt_range = f"{alt_min}--{alt_max}"
    
    try:
        kwargs = {
            "inclination": inc_range,
            "periapsis": alt_range,
            "format": "json",
            "limit": 1000
        }
        if object_type:
            kwargs["object_type"] = object_type
            
        data = client.gp(**kwargs)
        
        import json
        try:
            if isinstance(data, str):
                data = json.loads(data)
            if not isinstance(data, list):
                print(f'[FETCH] Unexpected response format: {type(data)}')
                return []
        except Exception as e:
            print(f'[FETCH] JSON parse error: {e}')
            return []
            
        results = []
        for record in data:
            obj = {
                "name": record.get("OBJECT_NAME", "UNKNOWN"),
                "line1": record.get("TLE_LINE1"),
                "line2": record.get("TLE_LINE2"),
                "norad_id": int(record.get("NORAD_CAT_ID", 0)),
                "inclination_deg": float(record.get("INCLINATION", 0)),
                "altitude_km": float(record.get("APOAPSIS", 400.0)),
                "bstar": float(record.get("BSTAR", 0.0001))
            }
            results.append(validate_tle_object(obj))
        return results[:1000]
    except Exception as e:
        print(f"Error fetching shell TLEs: {e}")
        return []

def fetch_shell_tles(altitude_km: float, inclination_deg: float) -> list[dict]:
    """Fetch all objects in orbital shell."""
    return _fetch_by_shell(altitude_km, inclination_deg, object_type=None)

def fetch_debris_tles(altitude_km: float, inclination_deg: float) -> list[dict]:
    """Same as fetch_shell_tles but object_type='DEBRIS'."""
    return _fetch_by_shell(altitude_km, inclination_deg, object_type="DEBRIS")
