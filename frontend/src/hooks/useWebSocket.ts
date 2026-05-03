import { useContext, useEffect, useState, useRef } from 'react';
import { MissionContext } from '../context/MissionContext';
import { AnalysisResult } from '../types';

import { API_ENDPOINTS } from '../config/api';


export function useWebSocket(noradId?: number) {
  const context = useContext(MissionContext);
  if (!context) throw new Error("useWebSocket must be used within MissionProvider");

  const { setAnalysisResult, isDemoMode, setIsLoading, settings } = context;
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number>();
  const lastFullUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (!noradId || isDemoMode) return;

    const connect = () => {
      const wsUrl = API_ENDPOINTS.wsLive(noradId);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (!data.error) {
            // Map snake_case to camelCase
            if (data.mission) {
              data.mission.altitudeKm = data.mission.altitude_km ?? data.mission.altitudeKm;
              data.mission.apogeeKm = data.mission.apogee_km ?? data.mission.apogeeKm;
              data.mission.perigeeKm = data.mission.perigee_km ?? data.mission.perigeeKm;
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
            
            
            const now = Date.now();
            const intervalMs = settings.refreshInterval === 'manual' ? Infinity : (settings.refreshInterval as number) * 1000;
            
            if (settings.refreshInterval === 'manual' || now - lastFullUpdateRef.current < intervalMs - 5000) {
              // Only update live position, ignore full conjunction refresh
              setAnalysisResult((prev: AnalysisResult | null) => {
                if (!prev) return data;
                return {
                  ...prev,
                  mission: {
                    ...prev.mission,
                    position: data?.mission?.position || prev.mission.position,
                    orbitPath: data?.mission?.orbitPath || prev.mission.orbitPath
                  }
                };
              });
            } else {
              // Full update
              setAnalysisResult(data);
              lastFullUpdateRef.current = now;
              setLastUpdate(new Date());
            }
            
            setIsLoading(false);
          }
        } catch (e) {
          console.error("Failed to parse WS msg", e);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected, retrying in 5s");
        setIsConnected(false);
        reconnectTimeoutRef.current = window.setTimeout(connect, 5000);
      };

      ws.onerror = (err) => {
        console.log("WebSocket error:", err);
      };

      wsRef.current = ws;
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on unmount
        wsRef.current.close();
      }
    };
  }, [noradId, setAnalysisResult, isDemoMode, settings.refreshInterval]);

  return { isConnected, lastUpdate };
}
