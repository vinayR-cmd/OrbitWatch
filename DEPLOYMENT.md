# OrbitWatch Deployment Checklist

## Environment Files Explained

Each environment file has a specific role — do not mix them:

| File | Purpose | Committed? |
|------|---------|------------|
| `spacex_developing/.env` | Backend secrets (credentials, CORS) | ❌ Never |
| `spacex_developing/.env.example` | Backend template — safe reference | ✅ Yes |
| `frontend/.env` | Frontend secrets (tokens, API URL) | ❌ Never |
| `frontend/.env.example` | Frontend template — safe reference | ✅ Yes |
| `frontend/.env.production` | Production frontend config | ❌ Never |

> **Rule:** `SPACETRACK_USER` / `SPACETRACK_PASS` / `ALLOWED_ORIGINS` → root `.env` only.  
> `VITE_*` variables → `frontend/.env` only.

---

## Before Deploying

### Backend
- [ ] Set `SPACETRACK_USER` in environment variables
- [ ] Set `SPACETRACK_PASS` in environment variables
- [ ] Set `ALLOWED_ORIGINS` to your frontend domain (e.g. `https://your-app.vercel.app`)
- [ ] Verify `models/orbital_transformer.pth` is present
- [ ] Verify `models/training_config.json` is present
- [ ] Verify `data/processed/scaler_params.json` is present
- [ ] Run: `python -m pytest backend/test_model.py`
- [ ] Run: `python -m pytest backend/test_benchmark.py`

### Frontend
- [ ] Set `VITE_API_BASE_URL` to your backend URL
- [ ] Run: `npm run build`
- [ ] Verify `dist/` folder is generated
- [ ] Test the build locally with: `npm run preview`

---

## Deployment Platforms

### Backend options

**Render.com** (recommended for free tier):
```
Build command : pip install -r requirements.txt
Start command : uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

**Railway.app**:
```
Build command : pip install -r requirements.txt
Start command : uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

### Frontend options

**Vercel** (recommended):
```
Framework     : Vite
Build command : npm run build
Output dir    : dist
Root dir      : frontend/
```

**Netlify**:
```
Build command : npm run build
Publish dir   : frontend/dist
```

---

## Environment Variables Summary

### Backend (set on your hosting platform)
| Variable | Value |
|----------|-------|
| `SPACETRACK_USER` | your Space-Track email |
| `SPACETRACK_PASS` | your Space-Track password |
| `ALLOWED_ORIGINS` | `https://your-frontend-domain.com` |

### Frontend (set on your hosting platform)
| Variable | Value |
|----------|-------|
| `VITE_API_BASE_URL` | `https://your-backend-domain.com` |

---

## Post-Deployment Verification

- [ ] `GET /health` returns `{"status": "ok", "model_loaded": true}`
- [ ] `POST /api/analyze/norad` with body `{"norad_id": 25544}` returns mission data
- [ ] WebSocket `wss://your-backend/ws/live/25544` connects successfully
- [ ] Frontend globe loads and displays satellite
- [ ] Mode A pre-launch analysis completes without errors
- [ ] Mode B (NORAD) analysis fetches live TLE data
- [ ] Orbital decay predictor shows charts

---

> **Note:** The WebSocket endpoint uses `wss://` (secure) automatically when your backend URL starts with `https://`. This is required for browsers running on HTTPS sites.
