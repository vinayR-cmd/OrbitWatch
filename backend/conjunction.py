import math
import logging
import numpy as np
from datetime import datetime, timedelta, timezone
from scipy.spatial import KDTree
from .propagate import tle_to_satrec, propagate_at
from .predict import predict_corrected_position

logger = logging.getLogger(__name__)

ISS_COMPLEX_NORAD_IDS = {
    25544, 20400, 49044, 25575, 26400, 36088,
    38317, 67796, 66664, 68319, 43205, 48903,
    27606, 28654, 39329, 32060, 33340
}

def screen_candidates(
    mission_pos: dict,           # {x_km, y_km, z_km}
    all_objects: list[dict],     # each has {name, norad_id, x_km, y_km, z_km, ...}
    radius_km: float = 50.0
) -> list[dict]:
    """Use scipy KDTree to find all objects within radius_km of mission_pos."""
    if not all_objects:
        return []
        
    # Extract positions
    coords = [[obj["x_km"], obj["y_km"], obj["z_km"]] for obj in all_objects]
    tree = KDTree(coords)
    
    m_coord = [mission_pos["x_km"], mission_pos["y_km"], mission_pos["z_km"]]
    
    # Query all points within radius_km
    indices = tree.query_ball_point(m_coord, r=radius_km)
    
    filtered = []
    for idx in indices:
        obj = all_objects[idx].copy()
        
        # Calculate strict Euclidean distance
        dist = math.sqrt(
            (obj["x_km"] - m_coord[0])**2 + 
            (obj["y_km"] - m_coord[1])**2 + 
            (obj["z_km"] - m_coord[2])**2
        )
        obj["distance_km"] = dist
        filtered.append(obj)
        
    return filtered

def monte_carlo_pc(
    pos1: dict, vel1: dict,
    pos2: dict, vel2: dict,
    sigma_km: float = 0.1,
    n_samples: int = 10000
) -> float:
    """Monte Carlo collision probability."""
    p1 = np.array([pos1["x_km"], pos1["y_km"], pos1["z_km"]])
    p2 = np.array([pos2["x_km"], pos2["y_km"], pos2["z_km"]])
    
    # Sample from isotropic Gaussian
    samples1 = np.random.normal(loc=p1, scale=sigma_km, size=(n_samples, 3))
    samples2 = np.random.normal(loc=p2, scale=sigma_km, size=(n_samples, 3))
    
    dists = np.linalg.norm(samples1 - samples2, axis=1)
    
    # Hard body radius condition (< 0.1 km = 100m)
    collisions = np.sum(dists < 0.1)
    # Cap at physically meaningful maximum
    # A Pc above 0.01 is essentially "certain collision"
    # and should be treated as a filter failure, not a result
    return min(float(collisions / n_samples), 0.99)

def get_states(mission_sat, cand_sat, mission_norad, cand_norad, tle_history_map, test_dt):
    """Get propagated states for mission and candidate satellite at a given datetime."""
    m_s = propagate_at(mission_sat, test_dt)
    c_s = propagate_at(cand_sat, test_dt)
    if not m_s or not c_s:
        return None, None
    if tle_history_map:
        if mission_norad in tle_history_map:
            m_s = predict_corrected_position(tle_history_map[mission_norad], m_s)
        if cand_norad in tle_history_map:
            c_s = predict_corrected_position(tle_history_map[cand_norad], c_s)
    return m_s, c_s

def find_conjunctions(
    mission: dict,             # {name, line1, line2, norad_id}
    candidates: list[dict],    # each has {name, line1, line2, norad_id}
    hours: int = 72,
    tle_history_map: dict[int, list[dict]] = None
) -> list[dict]:
    """Propagate across 72h at 10-min intervals."""
    try:
        if not candidates:
            return []
            
        try:
            mission_sat = tle_to_satrec(mission["line1"], mission["line2"])
        except Exception:
            return []

        results = []
        now = datetime.now(timezone.utc)
        intervals = int((hours * 60) / 10) # 10-min intervals
        
        # Pre-calculate mission trajectory to save loop time
        mission_traj = []
        mission_norad = mission.get("norad_id", 0)
        for i in range(intervals):
            dt = now + timedelta(minutes=10 * i)
            sgp4_state = propagate_at(mission_sat, dt)
            if sgp4_state is None:
                continue
            if tle_history_map and mission_norad in tle_history_map:
                state = predict_corrected_position(tle_history_map[mission_norad], sgp4_state)
            else:
                state = sgp4_state
            mission_traj.append((dt, state))
            
        for cand in candidates:
            try:
                cand_sat = tle_to_satrec(cand["line1"], cand["line2"])
            except Exception:
                continue
                
            min_dist = float('inf')
            tca_time = None
            tca_mission_state = None
            tca_cand_state = None
            cand_norad = cand.get("norad_id", 0)
            
            if cand_norad == mission_norad:
                continue
                
            # FILTER 1 — Known ISS complex exclusion list
            if mission_norad in ISS_COMPLEX_NORAD_IDS and cand_norad in ISS_COMPLEX_NORAD_IDS:
                continue
                
            # FILTER 2 — General co-location filter
            cand_x = cand.get("x_km", None)
            cand_y = cand.get("y_km", None)  
            cand_z = cand.get("z_km", None)
            
            # Only apply filter if candidate has position data
            if cand_x is not None and cand_y is not None and cand_z is not None:
                if mission_traj and mission_traj[0][1]:
                    m_t0 = mission_traj[0][1]
                    dist_t0 = math.sqrt(
                        (cand_x - m_t0["x_km"])**2 +
                        (cand_y - m_t0["y_km"])**2 +
                        (cand_z - m_t0["z_km"])**2
                    )
                    if dist_t0 < 5.0:
                        cand_name = cand.get("name", "Unknown")
                        print(f"[FILTER2] Skipping {cand_name} "
                              f"({cand_norad}) — co-located at T=0 "
                              f"({dist_t0:.3f} km)")
                        continue
            else:
                print(f"[FILTER2] Warning: {cand.get('name')} has no "
                      f"position data — skipping Filter 2")
            
            for dt, m_state in mission_traj:
                if not m_state:
                    continue
                    
                sgp4_c_state = propagate_at(cand_sat, dt)
                if not sgp4_c_state:
                    continue
                    
                if tle_history_map and cand_norad in tle_history_map:
                    c_state = predict_corrected_position(tle_history_map[cand_norad], sgp4_c_state)
                else:
                    c_state = sgp4_c_state
                    
                dist = math.sqrt(
                    (m_state["x_km"] - c_state["x_km"])**2 +
                    (m_state["y_km"] - c_state["y_km"])**2 +
                    (m_state["z_km"] - c_state["z_km"])**2
                )
                
                if dist < min_dist:
                    min_dist = dist
                    tca_time = dt
                    tca_mission_state = m_state
                    tca_cand_state = c_state
                    
            if tca_time:
                # Pass 1: +/- 10 mins by 1 min steps
                best_ref_t = tca_time
                for offset_mins in range(-10, 11):
                    if offset_mins == 0: continue
                    test_t = tca_time + timedelta(minutes=offset_mins)
                    m_s, c_s = get_states(mission_sat, cand_sat, mission_norad, cand_norad, tle_history_map, test_t)
                    if m_s and c_s:
                        d = math.sqrt((m_s["x_km"]-c_s["x_km"])**2 + (m_s["y_km"]-c_s["y_km"])**2 + (m_s["z_km"]-c_s["z_km"])**2)
                        if d < min_dist:
                            min_dist = d
                            best_ref_t = test_t
                            tca_mission_state, tca_cand_state = m_s, c_s
                
                # Pass 2: +/- 1 min by 5 second steps
                tca_time = best_ref_t
                for offset_sec in range(-60, 61, 5):
                    if offset_sec == 0: continue
                    test_t = tca_time + timedelta(seconds=offset_sec)
                    m_s, c_s = get_states(mission_sat, cand_sat, mission_norad, cand_norad, tle_history_map, test_t)
                    if m_s and c_s:
                        d = math.sqrt((m_s["x_km"]-c_s["x_km"])**2 + (m_s["y_km"]-c_s["y_km"])**2 + (m_s["z_km"]-c_s["z_km"])**2)
                        if d < min_dist:
                            min_dist = d
                            best_ref_t = test_t
                            tca_mission_state, tca_cand_state = m_s, c_s
                            
                tca_time = best_ref_t
                    
            if tca_time:
                m_pos = {"x_km": tca_mission_state["x_km"], "y_km": tca_mission_state["y_km"], "z_km": tca_mission_state["z_km"]}
                m_vel = {"vx": tca_mission_state.get("vx", 0), "vy": tca_mission_state.get("vy", 0), "vz": tca_mission_state.get("vz", 0)}
                
                c_pos = {"x_km": tca_cand_state["x_km"], "y_km": tca_cand_state["y_km"], "z_km": tca_cand_state["z_km"]}
                c_vel = {"vx": tca_cand_state.get("vx", 0), "vy": tca_cand_state.get("vy", 0), "vz": tca_cand_state.get("vz", 0)}
                
                if min_dist < 0.001:  # less than 1 meter — clearly same object
                    print(f"[GUARD] Skipping Monte Carlo — miss dist "
                          f"{min_dist*1000:.1f}m indicates same object")
                    continue  # skip this candidate entirely
                
                if min_dist < 10.0:
                    pc = monte_carlo_pc(m_pos, m_vel, c_pos, c_vel)
                else:
                    pc = float(math.exp(-min_dist / 100.0) * 1e-5)
                
                if pc > 1e-4:
                    action = "MANEUVER"
                elif pc > 1e-6:
                    action = "MONITOR"
                else:
                    action = "ALL CLEAR"
                
                results.append({
                    "name": cand["name"],
                    "norad_id": cand_norad,
                    "tca_time": tca_time.isoformat(),
                    "miss_distance_km": min_dist,
                    "pc": pc,
                    "action": action,
                    "x_km": cand.get("x_km", 0),
                    "y_km": cand.get("y_km", 0),
                    "z_km": cand.get("z_km", 0),
                    "vx": cand.get("vx", 0),
                    "vy": cand.get("vy", 0),
                    "vz": cand.get("vz", 0)
                })
                
        # Sort descending by risk (pc)
        results.sort(key=lambda x: x["pc"], reverse=True)
        return results[:10]  # Always return at least the top 10 closest encounters

    except Exception as e:
        logger.exception(f"Error evaluating conjunctions: {e}")
        return []
