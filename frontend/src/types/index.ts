export interface MissionInput {
  mode: 'norad' | 'prelaunch';
  noradId?: number;
  missionName?: string;
  apogeeKm?: number;
  perigeeKm?: number;
  altitudeKm?: number; // legacy fallback
  inclinationDeg?: number;
  launchTime?: string;
}

export interface Position {
  xKm: number;
  yKm: number;
  zKm: number;
}

export interface ConjunctionEvent {
  name: string;
  noradId: number;
  tcaTime: string;
  missDistanceKm: number;
  pc: number;
  action: 'MANEUVER' | 'MONITOR';
}

export interface AnalysisResult {
  mission: {
    name: string;
    noradId: number;
    altitudeKm: number;
    apogeeKm?: number;
    perigeeKm?: number;
    inclinationDeg: number;
    position: Position;
    orbitPath?: Position[];
    apogeePoint?: Position & { altitudeKm: number };
    perigeePoint?: Position & { altitudeKm: number };
  };
  conjunctions: ConjunctionEvent[];
  summary: {
    totalScreened: number;
    candidates: number;
    highRiskCount: number;
    nextTca: string | null;
    densityBands?: { label: string, count: number, fill: string }[];
  };
}

export interface LayerState {
  debrisCloud: boolean;
  activeSatellites: boolean;
  safeRoutingCorridor: boolean;
  tcaMarkers: boolean;
  uncertaintyEllipsoids: boolean;
}

export interface SimulationState {
  currentHour: number;
  speed: 0.5 | 1 | 10;
  isPlaying: boolean;
}

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
}

export interface SettingsState {
  units: 'km' | 'miles';
  timeFormat: 'utc' | 'local';
  showLabels: boolean;
  dotSize: 'small' | 'medium' | 'large';
  orbitOpacity: number;
  globeTheme: 'space' | 'terrain' | 'minimal';
  simSpeed: 0.5 | 1 | 10 | 'live';
  refreshInterval: 30 | 60 | 120 | 'manual';
  showEllipsoids: boolean;
}
