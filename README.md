# OrbitWatch 🛰️
### Advanced Space Situational Awareness Dashboard

OrbitWatch is a high-fidelity orbital mechanics and space debris tracking platform that combines classical physics with deep learning to monitor satellite trajectories, predict conjunction risks, and support collision avoidance planning.

**Data source**: Space-Track.org (NORAD catalog)  
**Model**: OrbitalTransformer (custom PyTorch Transformer)

---

## ✨ Features

### Mode A — Pre-Launch Mission Planning
- RK45 numerical integration with J2/J3 gravitational perturbations and atmospheric drag
- Real-time conjunction screening against live NORAD catalog
- Orbital decay prediction with 25-year compliance check
- Fuel cost calculator using Tsiolkovsky rocket equation

### Mode B — Active Satellite Tracking
- Live TLE fetching from Space-Track.org
- AI-corrected position predictions via OrbitalTransformer
- 72-hour conjunction screening with Monte Carlo Pc calculation
- Orbital decay predictor (natural + sustained orbit modes)
- Position uncertainty ellipsoids (RIC frame)

### Dashboard Features
- CesiumJS 3D globe with real-time satellite visualization
- Conjunction risk timeline (T+0 to T+72h)
- TCA markers with miss distance and Pc scoring
- Debris cloud visualization with object labels
- Maneuver planner with Δv calculation
- Settings panel (units, display, refresh interval)
- PDF report export

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│              React Frontend                  │
│   CesiumJS Globe · Recharts · TypeScript     │
└──────────────────┬──────────────────────────┘
                   │ REST + WebSocket
┌──────────────────▼──────────────────────────┐
│              FastAPI Backend                 │
│                                             │
│  ┌─────────────┐    ┌────────────────────┐  │
│  │  Mode A     │    │  Mode B            │  │
│  │  RK45+J2/J3 │    │  SGP4 + AI hybrid  │  │
│  │  Pre-Launch │    │  Active Satellite  │  │
│  └─────────────┘    └────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │  OrbitalTransformer (PyTorch)        │   │
│  │  Learns SGP4 residuals from          │   │
│  │  20-snapshot TLE history             │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │  Space-Track.org API                 │   │
│  │  Live TLEs · Shell fetch · History   │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| 3D Globe | CesiumJS |
| Charts | Recharts |
| Backend | FastAPI, Python 3.10+ |
| Orbital Mechanics | sgp4, scipy (RK45) |
| AI Model | PyTorch (OrbitalTransformer) |
| Spatial Index | scipy KDTree |
| Data Source | Space-Track.org (NORAD) |

---

## 🚀 Local Development Setup

### Prerequisites
- Python 3.10 or higher
- Node.js 18 or higher
- Free account at [space-track.org](https://www.space-track.org)
- Model weights file (see AI Model Setup below)

### 1. Clone and install

```bash
git clone https://github.com/yourusername/orbitwatch.git
cd orbitwatch/spacex_developing
```

### 2. Backend setup

```bash
# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your Space-Track credentials
```

### 3. Frontend setup

```bash
cd frontend
npm install
```

### 4. AI Model setup

Place these files in the `models/` folder:
```
models/
  orbital_transformer.pth     ← model weights
  training_config.json        ← model architecture config
  scaler_params.json          ← feature normalization params
```

### 5. Run locally

```bash
# Terminal 1 — Backend (from spacex_developing/)
uvicorn backend.main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## ☁️ Production Deployment

### Backend (Render / Railway / VPS)

```bash
# Build command
pip install -r requirements.txt

# Start command
uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

**Environment variables to set on your platform:**
```
SPACETRACK_USER=your_email@example.com
SPACETRACK_PASS=your_password
```

### Frontend (Vercel / Netlify)

```bash
# Build command
cd frontend && npm run build

# Output directory
frontend/dist
```

**Environment variable:**
```
VITE_API_BASE_URL=https://your-backend-url.com
```

---

## 🤖 AI Model — OrbitalTransformer

The OrbitalTransformer is a custom Transformer encoder trained to predict SGP4 position residuals from 20 consecutive TLE snapshots.

```
Architecture:
  Input  : (batch, 20, 7) — 20 TLE snapshots × 7 features
  Features: inclination, eccentricity, RAAN, arg_perigee,
            mean_anomaly, mean_motion, B*
  d_model : 128
  Heads   : 4
  Layers  : 3
  Output  : (batch, 3) — x,y,z position correction (km)
```

**Training data**: 30 days of satellite and debris TLEs  
**Training platform**: Google Colab (T4 GPU)  
**Validation skill score**: 81% improvement over raw SGP4

The model operates only in Mode B — active satellites with tracking history. Mode A uses pure physics (RK45).

---

## 📐 Mathematical Foundation

### RK45 Propagator (Mode A)
Numerically integrates equations of motion with:
- Point mass gravity (GM = 398600.4418 km³/s²)
- J2 perturbation (Earth oblateness, J2 = 1.08263×10⁻³)
- J3 perturbation (Earth pear shape, J3 = −2.53265×10⁻⁶)
- Atmospheric drag: `a_drag = −B* × ρ × |v| × v`

### Conjunction Screening
- Stage 1: Shell filter (altitude ±50 km, inclination ±5°)
- Stage 2: KDTree coarse screen (500 km radius)
- Stage 3: 72-hour propagation at 10-minute intervals
- Stage 4: TCA refinement to 5-second precision
- Stage 5: Monte Carlo Pc for close approaches (<10 km)

### Orbital Decay Predictor
Uses NASA piecewise exponential atmosphere model (200–1000 km):
- Mode 1: Natural ballistic decay (no engines)
- Mode 2: Sustained orbit with reboost fuel budget

### False-Positive Filters
- ISS complex exclusion (modules, docked spacecraft)
- Co-location filter: skips objects within 5 km at T=0

---

## 📁 Project Structure

```
spacex_developing/
├── backend/
│   ├── main.py           # FastAPI endpoints
│   ├── conjunction.py    # Conjunction screening + TCA
│   ├── propagate.py      # SGP4 + RK45 propagators
│   ├── predict.py        # OrbitalTransformer inference
│   ├── model.py          # Transformer architecture
│   ├── fetch.py          # Space-Track API client
│   ├── decay.py          # Orbital decay predictor
│   ├── maneuver.py       # Fuel cost calculator
│   └── cache.py          # TLE shell cache
├── frontend/
│   └── src/
│       ├── components/   # React UI components
│       ├── hooks/        # Custom React hooks
│       └── context/      # Global app state (MissionContext)
├── models/
│   ├── orbital_transformer.pth
│   └── training_config.json
├── data/
│   ├── raw/              # TLE source files
│   └── processed/        # Normalized data + scalers
├── notebooks/
│   └── 01_parse_data.ipynb
├── .env.example          # Environment variable template
├── requirements.txt
└── README.md
```

---

## 🔍 Accuracy Notes

- All orbital predictions are estimates based on TLE data
- SGP4 position errors: 1–15 km over 72 hours
- RK45 position errors: <2 km over 72 hours
- OrbitalTransformer improves Mode B accuracy by ~81%
- All conjunction risks should be verified with official flight dynamics teams before mission execution

---

## 📄 License

MIT License — see LICENSE file for details.

---

## 🙏 Acknowledgements

- [Space-Track.org](https://www.space-track.org) for real-time orbital data
- [CesiumJS](https://cesium.com) for 3D globe visualization
- [sgp4](https://pypi.org/project/sgp4/) Python library for TLE propagation
- NASA/NORAD for maintaining the satellite catalog

---

*Built for space situational awareness* 🛰️
