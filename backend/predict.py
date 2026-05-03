# backend/predict.py  — complete replacement

import torch
import numpy as np
import json
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

FEATURE_NAMES = [
    'inclination', 'eccentricity', 'raan', 
    'arg_perigee', 'mean_anomaly', 'mean_motion', 'bstar'
]

_model = None
_scaler = None
_config = None

def _load_model_once():
    global _model, _scaler, _config

    if _model is not None:
        return True

    config_path = os.path.join(
        os.path.dirname(__file__), '..', 'models', 'training_config.json'
    )
    weights_path = os.path.join(
        os.path.dirname(__file__), '..', 'models', 'orbital_transformer.pth'
    )
    scaler_path = os.path.join(
        os.path.dirname(__file__), '..', 'data', 'processed', 'scaler_params.json'
    )

    try:
        with open(config_path) as f:
            _config = json.load(f)
        with open(scaler_path) as f:
            _scaler = json.load(f)
    except Exception as e:
        logger.error(f"Could not load config or scaler: {e}")
        return False

    try:
        from backend.model import OrbitalTransformer
        _model = OrbitalTransformer(**_config)
        checkpoint = torch.load(weights_path, map_location='cpu', weights_only=True)
        if isinstance(checkpoint, dict) and 'model_state_dict' in checkpoint:
            state = checkpoint['model_state_dict']
        elif isinstance(checkpoint, dict) and 'state_dict' in checkpoint:
            state = checkpoint['state_dict']
        else:
            state = checkpoint
        _model.load_state_dict(state)
        _model.eval()
        logger.info("OrbitalTransformer loaded successfully")
        return True
    except Exception as e:
        logger.error(f"Could not load model weights: {e}")
        _model = None
        return False


def _normalise_features(features: list[float]) -> list[float]:
    """Normalise 7 features using scaler_params.json."""
    normalised = []
    for i, name in enumerate(FEATURE_NAMES):
        val = features[i]
        try:
            # Adapt this block based on actual scaler_params.json structure
            if isinstance(_scaler, dict) and name in _scaler:
                entry = _scaler[name]
                if isinstance(entry, dict):
                    mean = entry.get('mean', 0)
                    std = entry.get('std', 1)
                else:
                    mean, std = 0, 1
            elif isinstance(_scaler, dict) and 'mean' in _scaler:
                mean = _scaler['mean'][i]
                std = _scaler['std'][i]
            else:
                mean, std = 0, 1
            std = std if std != 0 else 1
            normalised.append((val - mean) / std)
        except Exception:
            normalised.append(val)
    return normalised


def build_sequence_from_tles(tle_history: list[dict]) -> Optional[torch.Tensor]:
    """
    Given list of dicts with keys: 
    inclination, eccentricity, raan, arg_perigee, 
    mean_anomaly, mean_motion, bstar
    Build a (1, 20, 7) tensor for model input.
    """
    if not tle_history:
        return None

    sequences = []
    for tle in tle_history[-20:]:  # use last 20 max
        features = []
        for name in FEATURE_NAMES:
            features.append(float(tle.get(name, 0.0)))
        sequences.append(_normalise_features(features))

    # Pad with zeros on left if fewer than 20
    while len(sequences) < 20:
        sequences.insert(0, [0.0] * 7)

    arr = np.array(sequences, dtype=np.float32)  # (20, 7)
    tensor = torch.tensor(arr).unsqueeze(0)       # (1, 20, 7)
    return tensor


def predict_corrected_position(
    tle_history: list[dict],
    sgp4_position: dict
) -> dict:
    """
    Run OrbitalTransformer on TLE history.
    Returns SGP4 position + small learned correction.
    Falls back to pure SGP4 if model unavailable.
    """
    if not _load_model_once():
        return sgp4_position

    try:
        sequence = build_sequence_from_tles(tle_history)
        if sequence is None:
            return sgp4_position

        with torch.no_grad():
            correction = _model(sequence)  # (1, 3)

        cx, cy, cz = correction[0].tolist()

        # Guard: if correction is NaN or unreasonably large, skip it
        if any(np.isnan(v) for v in [cx, cy, cz]):
            logger.warning("Model output NaN — using pure SGP4")
            return sgp4_position
        if any(abs(v) > 1000 for v in [cx, cy, cz]):
            logger.warning("Model correction too large — clamping to SGP4")
            return sgp4_position

        # Apply correction with scale factor 0.1
        # (model predicts residual, not absolute position)
        dt_raw = sgp4_position.get('dt')
        if dt_raw:
            from datetime import datetime
            from backend.propagate import teme_to_ecef
            dt = datetime.fromisoformat(dt_raw)
            cx, cy, cz = teme_to_ecef([cx*0.1, cy*0.1, cz*0.1], dt)
        else:
            cx, cy, cz = cx*0.1, cy*0.1, cz*0.1
            
        return {
            'x_km': sgp4_position['x_km'] + cx,
            'y_km': sgp4_position['y_km'] + cy,
            'z_km': sgp4_position['z_km'] + cz,
            'dt': dt_raw
        }

    except Exception as e:
        logger.warning(f"Model inference failed, using SGP4: {e}")
        return sgp4_position


def is_model_loaded() -> bool:
    return _load_model_once()
