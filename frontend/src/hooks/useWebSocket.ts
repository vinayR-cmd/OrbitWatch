import { useContext, useEffect, useRef } from 'react';
import { MissionContext } from '../context/MissionContext';
import { API_ENDPOINTS } from '../config/api';

export function useWebSocket(noradId?: number) {
  const context = useContext(MissionContext);
  if (!context) throw new Error('useWebSocket must be used within MissionProvider');

  const { setAnalysisResult, isDemoMode, setIsLoading } = context;
  const cancelledRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!noradId || isDemoMode) return;

    cancelledRef.current = false;

    const fetchAnalysis = async () => {
      if (cancelledRef.current) return;

      setIsLoading(true);
      const controller = new AbortController();
      const abortTimeoutId = setTimeout(() => controller.abort(), 90000);
      try {
        const response = await fetch(API_ENDPOINTS.analyzeNorad, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ norad_id: noradId }),
          signal: controller.signal,
        });
        clearTimeout(abortTimeoutId);

        if (!response.ok) throw new Error(`Analysis failed: ${response.status}`);

        const data = await response.json();

        if (!cancelledRef.current && data.mission) {
          // Map snake_case to camelCase
          if (data.mission) {
            data.mission.altitudeKm = data.mission.altitude_km ?? data.mission.altitudeKm;
            data.mission.apogeeKm = data.mission.apogee_km ?? data.mission.apogeeKm;
            data.mission.perigeeKm = data.mission.perigee_km ?? data.mission.perigeeKm;
            data.mission.inclinationDeg = data.mission.inclination_deg ?? data.mission.inclinationDeg;
            data.mission.noradId = data.mission.norad_id ?? data.mission.noradId;

            if (data.mission.apogee_point) {
              data.mission.apogeePoint = {
                xKm: data.mission.apogee_point.x_km ?? data.mission.apogee_point.x ?? data.mission.apogee_point.xKm,
                yKm: data.mission.apogee_point.y_km ?? data.mission.apogee_point.y ?? data.mission.apogee_point.yKm,
                zKm: data.mission.apogee_point.z_km ?? data.mission.apogee_point.z ?? data.mission.apogee_point.zKm,
                altitudeKm: data.mission.apogee_point.altitude_km ?? data.mission.apogee_point.altitudeKm,
              };
            }
            if (data.mission.perigee_point) {
              data.mission.perigeePoint = {
                xKm: data.mission.perigee_point.x_km ?? data.mission.perigee_point.x ?? data.mission.perigee_point.xKm,
                yKm: data.mission.perigee_point.y_km ?? data.mission.perigee_point.y ?? data.mission.perigee_point.yKm,
                zKm: data.mission.perigee_point.z_km ?? data.mission.perigee_point.z ?? data.mission.perigee_point.zKm,
                altitudeKm: data.mission.perigee_point.altitude_km ?? data.mission.perigee_point.altitudeKm,
              };
            }
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
          }

          setAnalysisResult(data);
        }
      } catch (error: unknown) {
        clearTimeout(abortTimeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          console.error('Analysis timed out after 90 seconds — retrying in 30s');
        } else {
          console.error('Analysis fetch error:', error);
        }
        // Do NOT fall back to mock data — stay in loading state and retry
        if (!cancelledRef.current) {
          setIsLoading(false);
          timeoutRef.current = setTimeout(fetchAnalysis, 30000);
        }
        return;
      } finally {
        if (!cancelledRef.current) {
          setIsLoading(false);
          // Poll again after 60 seconds on success
          timeoutRef.current = setTimeout(fetchAnalysis, 60000);
        }
      }
    };

    // Start immediately
    fetchAnalysis();

    return () => {
      cancelledRef.current = true;
      clearTimeout(timeoutRef.current);
    };
  }, [noradId, isDemoMode, setAnalysisResult, setIsLoading]);

  // Return shape kept compatible so App.tsx call site needs no change
  return { isConnected: !!noradId && !isDemoMode };
}
