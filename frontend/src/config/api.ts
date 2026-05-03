const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export const API_ENDPOINTS = {
  // Health
  health: `${API_BASE}/health`,

  // Analysis
  analyzeNorad: `${API_BASE}/api/analyze/norad`,
  analyzePrelaunch: `${API_BASE}/api/analyze/prelaunch`,

  // Shell
  shell: `${API_BASE}/api/objects/shell`,

  // Decay
  decayNatural: `${API_BASE}/api/decay/natural`,
  decaySustained: `${API_BASE}/api/decay/sustained`,

  // Maneuver
  maneuverFuelCost: `${API_BASE}/api/maneuver/fuel-cost`,

  // WebSocket — automatically converts http→ws and https→wss
  wsLive: (noradId: number) =>
    `${API_BASE.replace(/^http/, 'ws')}/ws/live/${noradId}`,
}

export default API_BASE
