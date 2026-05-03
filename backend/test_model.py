import torch, json, numpy as np, sys, os
import pytest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.model import OrbitalTransformer
from backend.predict import is_model_loaded, predict_corrected_position

def test_model_structure():
    try:
        with open("models/training_config.json") as f:
            config = json.load(f)
    except FileNotFoundError:
        pytest.skip("training_config.json not found")

    model = OrbitalTransformer(**config)
    dummy = torch.zeros(1, 20, 7)
    with torch.no_grad():
        out = model(dummy)
    assert out.shape == (1, 3)
    assert not torch.isnan(out).any()

def test_is_model_loaded_execution():
    # Test that is_model_loaded() returns True or False without crashing
    res = is_model_loaded()
    assert isinstance(res, bool)

def test_predict_corrected_position_valid():
    # Test that predict_corrected_position() returns a dict with x_km, y_km, z_km keys when given valid input
    tle_history = [{
        'inclination': 51.6, 'eccentricity': 0.0001, 'raan': 10.0,
        'arg_perigee': 20.0, 'mean_anomaly': 30.0, 'mean_motion': 15.5, 'bstar': 0.0001
    }] * 20
    sgp4_pos = {'x_km': 6000.0, 'y_km': 1000.0, 'z_km': 2000.0, 'dt': '2026-01-01T00:00:00'}
    
    res = predict_corrected_position(tle_history, sgp4_pos)
    assert isinstance(res, dict)
    assert 'x_km' in res
    assert 'y_km' in res
    assert 'z_km' in res

def test_predict_corrected_position_fallback():
    # Test that predict_corrected_position() falls back to SGP4 input when model is not loaded or history is empty
    sgp4_pos = {'x_km': 6000.0, 'y_km': 1000.0, 'z_km': 2000.0}
    res = predict_corrected_position([], sgp4_pos)
    assert res == sgp4_pos

if __name__ == "__main__":
    # Fallback for manual execution
    print("Running tests manually...")
    test_model_structure()
    print("test_model_structure passed")
    print("is_model_loaded():", test_is_model_loaded_execution())
    print("Tests completed.")
