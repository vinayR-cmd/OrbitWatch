import { AnalysisResult } from '../types';

export const MOCK_RESULT: AnalysisResult = {
  mission: {
    name: "Mock Satellite",
    noradId: 99999,
    altitudeKm: 420,
    apogeeKm: 422,
    perigeeKm: 418,
    inclinationDeg: 53.0,
    position: { xKm: 6921.0, yKm: -3100.2, zKm: 3800.1 },
    orbitPath: Array.from({length: 180}).map((_, i) => ({
      xKm: 6791 * Math.cos((i * 2 * Math.PI) / 180),
      yKm: 6791 * Math.sin((i * 2 * Math.PI) / 180),
      zKm: 0
    })),
    apogeePoint: { xKm: 6793, yKm: 0, zKm: 0, altitudeKm: 422 },
    perigeePoint: { xKm: -6789, yKm: 0, zKm: 0, altitudeKm: 418 }
  },
  conjunctions: [
    {
      name: "COSMOS 2251 DEB",
      noradId: 34427,
      tcaTime: new Date(Date.now() + 4 * 3600000).toISOString(),
      missDistanceKm: 0.87,
      pc: 0.00032,
      action: 'MANEUVER'
    },
    {
      name: "IRIDIUM 33 DEB",
      noradId: 33442,
      tcaTime: new Date(Date.now() + 11 * 3600000).toISOString(),
      missDistanceKm: 3.21,
      pc: 0.000089,
      action: 'MONITOR'
    },
    {
      name: "FENGYUN 1C DEB",
      noradId: 29228,
      tcaTime: new Date(Date.now() + 19 * 3600000).toISOString(),
      missDistanceKm: 8.44,
      pc: 0.000012,
      action: 'MONITOR'
    },
    {
      name: "SL-8 R/B DEB",
      noradId: 20551,
      tcaTime: new Date(Date.now() + 31 * 3600000).toISOString(),
      missDistanceKm: 14.2,
      pc: 0.0000034,
      action: 'MONITOR'
    },
    {
      name: "DEBRIS 2019-006C",
      noradId: 44028,
      tcaTime: new Date(Date.now() + 47 * 3600000).toISOString(),
      missDistanceKm: 22.8,
      pc: 0.00000091,
      action: 'MONITOR'
    }
  ],
  summary: {
    totalScreened: 3187,
    candidates: 5,
    highRiskCount: 1,
    nextTca: new Date(Date.now() + 4 * 3600000).toISOString()
  }
};
