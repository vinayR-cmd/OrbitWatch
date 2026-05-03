import sys
import os
import torch, json, numpy as np

# Adjust python path if necessary or run from spacex_developing
from backend.model import OrbitalTransformer

try:
    with open("models/training_config.json") as f:
        config = json.load(f)
    print("Loaded training_config.json")
    
    with open("data/processed/scaler_params.json") as f:
        scaler = json.load(f)
    print("Loaded scaler_params.json")

    model = OrbitalTransformer(**config)
    print("Initialized OrbitalTransformer")
    
    model.load_state_dict(
        torch.load("models/orbital_transformer.pth", map_location="cpu", weights_only=True)
    )
    print("Loaded model weights")
    
    model.eval()

    # Feed a dummy sequence
    dummy = torch.zeros(1, 20, 7)
    with torch.no_grad():
        out = model(dummy)
    print("OUTPUT:")
    print(out)
except Exception as e:
    import traceback
    traceback.print_exc()
