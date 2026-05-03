import json
import os
import torch
import torch.nn as nn
from typing import Dict, Any

class PositionalEncoding(nn.Module):
    def __init__(self, d_model=128, seq_len=20):
        super().__init__()
        self.positional_embedding = nn.Parameter(torch.zeros(1, seq_len, d_model))
        
    def forward(self, x):
        return x + self.positional_embedding

class OrbitalTransformer(nn.Module):
    def __init__(self, n_features=7, d_model=128, nhead=4, num_layers=3, dim_feedforward=256, dropout=0.1, seq_len=20, out_dim=3):
        super().__init__()
        self.input_projection = nn.Linear(n_features, d_model)
        self.positional_encoding = PositionalEncoding(d_model=d_model, seq_len=seq_len)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model, nhead=nhead, dim_feedforward=dim_feedforward, dropout=dropout, batch_first=True
        )
        self.transformer_encoder = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        self.output_head = nn.Linear(d_model, out_dim)

    def forward(self, x):
        x = self.input_projection(x)
        x = self.positional_encoding(x)
        x = self.transformer_encoder(x)
        x = x[:, -1, :]
        return self.output_head(x)

# Load parameters and config at module level
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")

# Load Scaler Params
scaler_path = os.path.join(PROCESSED_DIR, "scaler_params.json")
try:
    with open(scaler_path, "r") as f:
        scaler_params = json.load(f)
except FileNotFoundError:
    scaler_params = {}

# Load Training Config
config_path = os.path.join(MODELS_DIR, "training_config.json")
try:
    with open(config_path, "r") as f:
        config = json.load(f)
except FileNotFoundError:
    print("Warning: training_config.json not found, using default OrbitalTransformer configs.")
    config = {}

# Rebuild Model
model = OrbitalTransformer(**config)

# Load Weights
weight_path_1 = os.path.join(MODELS_DIR, "orbital_transformer.pth")
weight_path_2 = os.path.join(MODELS_DIR, "best_orbital_transformer_model.pth")
weight_path_3 = os.path.join(MODELS_DIR, "orbital_transformer.pt")

loaded_weights = False
for path in [weight_path_1, weight_path_2, weight_path_3]:
    if os.path.exists(path):
        model.load_state_dict(torch.load(path, map_location="cpu", weights_only=True), strict=False)
        loaded_weights = True
        break
        
if not loaded_weights:
    print(f"Warning: Could not find model weights (.pth) in {MODELS_DIR}.")
    
model.eval()

def normalize_features(features_dict: Dict[str, float]) -> list[float]:
    """Normalize dictionary of features into a list of scaled floats."""
    ordered_keys = [
        "inclination", "eccentricity", "raan", "arg_perigee", 
        "mean_anomaly", "mean_motion", "bstar"
    ]
    normalized = []
    for key in ordered_keys:
        val = features_dict.get(key, 0.0)
        mean = scaler_params.get(key, {}).get("mean", 0.0)
        std = scaler_params.get(key, {}).get("std", 1.0)
        if std == 0:
            std = 1.0
        normalized.append((val - mean) / std)
    return normalized

def denormalize_output(output_list: list[float]) -> dict:
    """Denormalize [x, y, z] to km."""
    try:
        x_norm, y_norm, z_norm = output_list
    except ValueError:
        return {"x_km": 0.0, "y_km": 0.0, "z_km": 0.0}
        
    x_km = x_norm * scaler_params.get("x_km", {}).get("std", 1.0) + scaler_params.get("x_km", {}).get("mean", 0.0)
    y_km = y_norm * scaler_params.get("y_km", {}).get("std", 1.0) + scaler_params.get("y_km", {}).get("mean", 0.0)
    z_km = z_norm * scaler_params.get("z_km", {}).get("std", 1.0) + scaler_params.get("z_km", {}).get("mean", 0.0)
    
    return {"x_km": x_km, "y_km": y_km, "z_km": z_km}
