import os, time, pytest, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.propagate import propagate_at, generate_synthetic_tle, tle_to_satrec
from backend.decay import simulate_natural_decay
from datetime import datetime, timezone

def test_propagate_at():
    # Test that propagate_at() returns valid position dict
    line1 = "1 25544U 98067A   26103.50000000  .00016717  00000-0  30000-3 0  9999"
    line2 = "2 25544  51.6400 000.0000 0001000  00.0000  00.0000 15.50000000000000"
    
    satrec = tle_to_satrec(line1, line2)
    dt = datetime(2026, 4, 13, 12, 0, 0, tzinfo=timezone.utc)
    
    res = propagate_at(satrec, dt)
    
    assert res is not None
    assert 'x_km' in res
    assert 'y_km' in res
    assert 'z_km' in res
    assert isinstance(res['x_km'], float)

def test_generate_synthetic_tle():
    # Test that generate_synthetic_tle() returns 5 values (l1, l2, pos, apogee_pt, perigee_pt)
    line1, line2, positions, apogee_pt, perigee_pt = generate_synthetic_tle(
        apogee_km=500,
        perigee_km=490,
        inclination_deg=51.6
    )
    
    assert isinstance(line1, str)
    assert isinstance(line2, str)
    assert line1.startswith('1 ')
    assert line2.startswith('2 ')
    assert isinstance(positions, list)
    assert len(positions) == 360
    assert isinstance(apogee_pt, dict)
    assert 'altitude_km' in apogee_pt
    assert isinstance(perigee_pt, dict)
    assert 'altitude_km' in perigee_pt

def test_simulate_natural_decay():
    # Test that simulate_natural_decay() returns a dict with reentry_days and decay_curve keys
    res = simulate_natural_decay(400, 0.0001)
    assert isinstance(res, dict)
    assert 'reentry_days' in res
    assert 'decay_curve' in res
    assert isinstance(res['decay_curve'], list)

if __name__ == "__main__":
    print("Running benchmarks...")
    # This file is now primarily for pytest, but can be run as a script
    test_propagate_at()
    test_generate_synthetic_tle()
    test_simulate_natural_decay()
    print("All basic benchmark tests passed.")
