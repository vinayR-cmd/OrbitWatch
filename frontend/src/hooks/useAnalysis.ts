import { useContext } from 'react';
import axios from 'axios';
import { MissionContext } from '../context/MissionContext';
import { MOCK_RESULT } from '../utils/mockData';

import { API_ENDPOINTS } from '../config/api';

function generateSyntheticPosition(altitudeKm: number, inclinationDeg: number) {
  const earthRadiusKm = 6371;
  const orbitRadiusKm = earthRadiusKm + altitudeKm;
  const incRad = (inclinationDeg * Math.PI) / 180;
  // Place satellite at angle 0 on its orbit
  return {
    xKm: orbitRadiusKm,
    yKm: 0,
    zKm: orbitRadiusKm * Math.sin(incRad) * 0.1,
  };
}

export function useAnalysis() {
  const context = useContext(MissionContext);
  if (!context) throw new Error("useAnalysis must be used within MissionProvider");

  const { missionInput, setAnalysisResult, setIsLoading, setError, setIsDemoMode } = context;

  const analyze = async (inputOverride?: any) => {
    const currentInput = inputOverride || missionInput;
    if (!currentInput) return;

    setIsLoading(true);
    setError(null);
    setIsDemoMode(false);

    try {
      if (currentInput.mode === 'norad') {
        if (!currentInput.noradId) throw new Error("NORAD ID is required");

        const res = await axios.post(API_ENDPOINTS.analyzeNorad, {
          norad_id: currentInput.noradId
        }, { timeout: 120000 });

        const data = res.data;
        // Map snake_case to camelCase
        if (data.mission) {
          data.mission.altitudeKm = data.mission.altitude_km ?? data.mission.altitudeKm;
          data.mission.apogeeKm = data.mission.apogee_km ?? data.mission.apogeeKm;
          data.mission.perigeeKm = data.mission.perigee_km ?? data.mission.perigeeKm;
          data.mission.inclinationDeg = data.mission.inclination_deg ?? data.mission.inclinationDeg;
          data.mission.noradId = data.mission.norad_id ?? data.mission.noradId;
          if (data.mission.orbit_path) {
            data.mission.orbitPath = data.mission.orbit_path.map((p: any) => ({
              xKm: p.x_km ?? p.x ?? p.xKm,
              yKm: p.y_km ?? p.y ?? p.yKm,
              zKm: p.z_km ?? p.z ?? p.zKm,
            }));
          }
          if (data.mission.position) {
            data.mission.position.xKm = data.mission.position.x_km ?? data.mission.position.xKm;
            data.mission.position.yKm = data.mission.position.y_km ?? data.mission.position.yKm;
            data.mission.position.zKm = data.mission.position.z_km ?? data.mission.position.zKm;
          }
          if (data.mission.apogee_point) {
            data.mission.apogeePoint = {
              xKm: data.mission.apogee_point.x_km ?? data.mission.apogee_point.x ?? data.mission.apogee_point.xKm,
              yKm: data.mission.apogee_point.y_km ?? data.mission.apogee_point.y ?? data.mission.apogee_point.yKm,
              zKm: data.mission.apogee_point.z_km ?? data.mission.apogee_point.z ?? data.mission.apogee_point.zKm,
              altitudeKm: data.mission.apogee_point.altitude_km ?? data.mission.apogee_point.altitudeKm
            };
          }
          if (data.mission.perigee_point) {
            data.mission.perigeePoint = {
              xKm: data.mission.perigee_point.x_km ?? data.mission.perigee_point.x ?? data.mission.perigee_point.xKm,
              yKm: data.mission.perigee_point.y_km ?? data.mission.perigee_point.y ?? data.mission.perigee_point.yKm,
              zKm: data.mission.perigee_point.z_km ?? data.mission.perigee_point.z ?? data.mission.perigee_point.zKm,
              altitudeKm: data.mission.perigee_point.altitude_km ?? data.mission.perigee_point.altitudeKm
            };
          }
        }
        if (data.conjunctions) {
          data.conjunctions = data.conjunctions.map((c: any) => ({
            ...c,
            tcaTime: c.tca_time ?? c.tcaTime,
            missDistanceKm: c.miss_distance_km ?? c.missDistanceKm,
            pcScore: c.pc ?? c.pcScore,
            noradId: c.norad_id ?? c.noradId,
          }));
        }
        if (data.summary) {
          data.summary.totalScreened = data.summary.total_screened ?? data.summary.totalScreened;
          data.summary.highRiskCount = data.summary.high_risk_count ?? data.summary.highRiskCount;
          data.summary.nextTca = data.summary.next_tca ?? data.summary.nextTca;
          data.summary.densityBands = data.summary.density_bands ?? data.summary.densityBands;
        }
        setAnalysisResult(data);
      } else {
        // Prelaunch mode
        const payload = {
          mission_name: currentInput.missionName || "Unknown",
          apogee_km: currentInput.apogeeKm || 550,
          perigee_km: currentInput.perigeeKm || 550,
          inclination_deg: currentInput.inclinationDeg || 45,
          launch_time: currentInput.launchTime || new Date().toISOString()
        };

        const res = await axios.post(API_ENDPOINTS.analyzePrelaunch, payload, { timeout: 120000 });
        const data = res.data;
        // Map snake_case to camelCase
        if (data.mission) {
          data.mission.altitudeKm = data.mission.altitude_km ?? currentInput.altitudeKm ?? 550;
          data.mission.apogeeKm = data.mission.apogee_km ?? currentInput.apogeeKm ?? 550;
          data.mission.perigeeKm = data.mission.perigee_km ?? currentInput.perigeeKm ?? 550;
          data.mission.inclinationDeg = data.mission.inclination_deg ?? currentInput.inclinationDeg ?? 53;
          data.mission.noradId = data.mission.norad_id ?? data.mission.noradId ?? 99999;
          if (data.mission.orbit_path) {
            data.mission.orbitPath = data.mission.orbit_path.map((p: any) => ({
              xKm: p.x_km ?? p.x ?? p.xKm,
              yKm: p.y_km ?? p.y ?? p.yKm,
              zKm: p.z_km ?? p.z ?? p.zKm,
            }));
          }
          if (data.mission.position) {
            data.mission.position.xKm = data.mission.position.x_km ?? data.mission.position.xKm;
            data.mission.position.yKm = data.mission.position.y_km ?? data.mission.position.yKm;
            data.mission.position.zKm = data.mission.position.z_km ?? data.mission.position.zKm;
          }
          if (data.mission.apogee_point) {
            data.mission.apogeePoint = {
              xKm: data.mission.apogee_point.x_km ?? data.mission.apogee_point.x ?? data.mission.apogee_point.xKm,
              yKm: data.mission.apogee_point.y_km ?? data.mission.apogee_point.y ?? data.mission.apogee_point.yKm,
              zKm: data.mission.apogee_point.z_km ?? data.mission.apogee_point.z ?? data.mission.apogee_point.zKm,
              altitudeKm: data.mission.apogee_point.altitude_km ?? data.mission.apogee_point.altitudeKm
            };
          }
          if (data.mission.perigee_point) {
            data.mission.perigeePoint = {
              xKm: data.mission.perigee_point.x_km ?? data.mission.perigee_point.x ?? data.mission.perigee_point.xKm,
              yKm: data.mission.perigee_point.y_km ?? data.mission.perigee_point.y ?? data.mission.perigee_point.yKm,
              zKm: data.mission.perigee_point.z_km ?? data.mission.perigee_point.z ?? data.mission.perigee_point.zKm,
              altitudeKm: data.mission.perigee_point.altitude_km ?? data.mission.perigee_point.altitudeKm
            };
          }
        }

        const pos = data.mission?.position;
        if (!pos || isNaN(pos.xKm) || isNaN(pos.yKm) || isNaN(pos.zKm) ||
          (pos.xKm === 0 && pos.yKm === 0 && pos.zKm === 0)) {
          data.mission.position = generateSyntheticPosition(
            data.mission.altitudeKm,
            data.mission.inclinationDeg
          );
        }
        
        if (data.conjunctions) {
          data.conjunctions = data.conjunctions.map((c: any) => ({
            ...c,
            tcaTime: c.tca_time ?? c.tcaTime,
            missDistanceKm: c.miss_distance_km ?? c.missDistanceKm,
            pcScore: c.pc ?? c.pcScore,
            noradId: c.norad_id ?? c.noradId,
          }));
        }
        if (data.summary) {
          data.summary.totalScreened = data.summary.total_screened ?? data.summary.totalScreened;
          data.summary.highRiskCount = data.summary.high_risk_count ?? data.summary.highRiskCount;
          data.summary.nextTca = data.summary.next_tca ?? data.summary.nextTca;
          data.summary.densityBands = data.summary.density_bands ?? data.summary.densityBands;
        }
        
        setAnalysisResult(data);
      }
    } catch (err: any) {
      console.warn("Backend unreachable or error occurred, using mock data.", err);
      setIsDemoMode(true);
      if (currentInput.mode === 'prelaunch') {
        const mockForPrelaunch = {
          ...MOCK_RESULT,
          mission: {
            ...MOCK_RESULT.mission,
            name: currentInput.missionName ?? 'My Mission',
            altitudeKm: currentInput.altitudeKm ?? 550,
            inclinationDeg: currentInput.inclinationDeg ?? 53,
            position: generateSyntheticPosition(
              currentInput.altitudeKm ?? 550,
              currentInput.inclinationDeg ?? 53
            ),
          },
        };
        setAnalysisResult(mockForPrelaunch as any); // using any in case of strict type mismatch
      } else {
        setAnalysisResult(MOCK_RESULT);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return { analyze, isLoading: context.isLoading, error: context.error };
}
