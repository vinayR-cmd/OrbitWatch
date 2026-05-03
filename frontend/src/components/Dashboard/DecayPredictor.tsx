import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { MissionContext } from '../../context/MissionContext';
import { Activity, Rocket } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { API_ENDPOINTS } from '../../config/api';

export const DecayPredictor: React.FC = () => {
  const context = useContext(MissionContext);
  const [activeTab, setActiveTab] = useState<'natural' | 'sustained'>('natural');

  // Natural decay state
  const [naturalResult, setNaturalResult] = useState<any>(null);
  const [loadingNatural, setLoadingNatural] = useState(false);

  // Sustained orbit state
  const [dryMassKg, setDryMassKg] = useState('500');
  const [ispSeconds, setIspSeconds] = useState('220');
  const [monthlyFuel, setMonthlyFuel] = useState('2');
  const [totalFuel, setTotalFuel] = useState('50');
  const [sustainedResult, setSustainedResult] = useState<any>(null);
  const [loadingSustained, setLoadingSustained] = useState(false);

  useEffect(() => {
    if (context?.analysisResult?.mission && context.missionInput?.mode === 'norad') {
      fetchNaturalDecay();
    }
  }, [context?.analysisResult, context?.missionInput?.mode]);

  if (!context || context.missionInput?.mode !== 'norad' || !context.analysisResult) {
    return null;
  }

  const mission = context.analysisResult.mission;
  const bstar = 0.0001;

  const fetchNaturalDecay = async () => {
    setLoadingNatural(true);
    try {
      const payload = {
        altitude_km: mission.altitudeKm,
        bstar: bstar
      };

      if (context.isDemoMode) {
        // Mock fallback for demo
        await new Promise(r => setTimeout(r, 500));
        setNaturalResult({
          mode: "natural",
          reentry_years: 4.2,
          reentry_year: 2030,
          decay_curve: [
            { day: 0, altitude_km: 400, phase: "natural" },
            { day: 500, altitude_km: 350, phase: "natural" },
            { day: 1000, altitude_km: 250, phase: "natural" },
            { day: 1533, altitude_km: 120, phase: "natural" }
          ]
        });
      } else {
        const res = await axios.post(API_ENDPOINTS.decayNatural, payload);
        setNaturalResult(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingNatural(false);
    }
  };

  const calculateSustained = async () => {
    setLoadingSustained(true);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const payload = {
        altitude_km: mission.altitudeKm,
        bstar: bstar,
        dry_mass_kg: Number(dryMassKg),
        isp_seconds: Number(ispSeconds),
        monthly_fuel_budget_kg: Number(monthlyFuel),
        total_fuel_kg: Number(totalFuel)
      };

      if (context.isDemoMode) {
        // Mock fallback for demo
        await new Promise(r => setTimeout(r, 500));
        setSustainedResult({
          maintained_months: 25,
          reentry_years: 6.5,
          fuel_exhausted_day: 750,
          decay_curve: [
            { day: 0, altitude_km: 400, phase: "maintained" },
            { day: 750, altitude_km: 400, phase: "maintained" },
            { day: 1000, altitude_km: 380, phase: "partial" },
            { day: 2372, altitude_km: 120, phase: "natural" }
          ]
        });
      } else {
        const res = await axios.post(API_ENDPOINTS.decaySustained, payload);
        setSustainedResult(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSustained(false);
    }
  };

  const currentAlt = mission.altitudeKm;

  // Format data for chart (convert days to years for X axis)
  const formatChartData = (curve: any[]) => {
    if (!curve) return [];
    return curve.map(p => ({
      ...p,
      years: Number((p.day / 365.25).toFixed(2))
    }));
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ background: '#0c1120', border: '1px solid #1a2845', padding: '8px', borderRadius: '4px', fontSize: '11px' }}>
          <p style={{ color: '#fff', margin: '0 0 4px 0' }}>Year {data.years}</p>
          <p style={{ color: '#00e5ff', margin: '0 0 4px 0' }}>Alt: {data.altitude_km} km</p>
          <p style={{ color: '#7986cb', margin: 0, textTransform: 'capitalize' }}>Phase: {data.phase}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-4 text-text-secondary">
        <Activity size={16} />
        <span className="text-[10px] text-[#4a5568] font-[500] uppercase tracking-[0.12em]">Orbital Decay Predictor</span>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          onClick={() => setActiveTab('natural')}
          style={{
            flex: 1, padding: '8px', fontSize: '11px', borderRadius: '4px',
            background: activeTab === 'natural' ? 'rgba(0, 229, 255, 0.1)' : 'transparent',
            border: activeTab === 'natural' ? '1px solid rgba(0, 229, 255, 0.3)' : '1px solid #1a2845',
            color: activeTab === 'natural' ? '#00e5ff' : '#7986cb',
            cursor: 'pointer'
          }}
        >
          NATURAL DECAY
        </button>
        <button
          onClick={() => setActiveTab('sustained')}
          style={{
            flex: 1, padding: '8px', fontSize: '11px', borderRadius: '4px',
            background: activeTab === 'sustained' ? 'rgba(0, 230, 118, 0.15)' : 'transparent',
            border: activeTab === 'sustained' ? '1px solid rgba(0, 230, 118, 0.4)' : '1px solid #1a2845',
            color: activeTab === 'sustained' ? '#00e676' : '#7986cb',
            cursor: 'pointer'
          }}
        >
          SUSTAINED ORBIT
        </button>
      </div>

      {activeTab === 'natural' && (
        <div style={{ background: '#0c1120', border: '1px solid #1a2845', borderRadius: '10px', padding: '16px' }}>
          {loadingNatural ? (
            <div className="text-text-secondary text-xs text-center py-8 animate-pulse">Calculating atmospheric drag...</div>
          ) : naturalResult ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#7986cb' }}>Reentry estimate</div>
                  <div style={{ fontSize: '14px', color: '#fff', fontWeight: 'bold' }}>{naturalResult.reentry_years.toFixed(1)} years</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#7986cb' }}>Reentry year</div>
                  <div style={{ fontSize: '14px', color: '#fff', fontWeight: 'bold' }}>{naturalResult.reentry_year}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '10px', color: '#7986cb' }}>Compliance</div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: naturalResult.reentry_years <= 25 ? '#00e676' : '#E24B4A' }}>
                    {naturalResult.reentry_years <= 25 ? '25-year rule met' : '25-year rule VIOLATED'}
                  </div>
                </div>
              </div>

              <div style={{ height: '200px', width: '100%' }} role="img" aria-label="Line chart showing satellite orbital decay over time">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formatChartData(naturalResult.decay_curve)} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2845" vertical={false} />
                    <XAxis
                      dataKey="years"
                      stroke="#4a5568"
                      tick={{ fill: '#7986cb', fontSize: 10 }}
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={(val) => `${val}y`}
                    />
                    <YAxis
                      stroke="#4a5568"
                      tick={{ fill: '#7986cb', fontSize: 10 }}
                      domain={[0, Math.ceil(currentAlt / 100) * 100]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={120} stroke="#E24B4A" strokeDasharray="3 3" label={{ position: 'top', value: 'reentry', fill: '#E24B4A', fontSize: 10 }} />
                    <ReferenceLine y={currentAlt} stroke="#00e5ff" strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="altitude_km" stroke="#E24B4A" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : null}
        </div>
      )}

      {activeTab === 'sustained' && (
        <div style={{ background: '#0c1120', border: '1px solid #1a2845', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', color: '#7986cb', fontSize: '10px', marginBottom: '4px' }}>Satellite dry mass (kg)</label>
              <input
                type="number" value={dryMassKg} onChange={e => setDryMassKg(e.target.value)}
                style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid #1a2845', color: '#fff', padding: '6px', borderRadius: '4px', fontSize: '11px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', color: '#7986cb', fontSize: '10px', marginBottom: '4px' }}>Thruster type</label>
              <select
                value={ispSeconds} onChange={e => setIspSeconds(e.target.value)}
                style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid #1a2845', color: '#fff', padding: '6px', borderRadius: '4px', fontSize: '11px' }}
              >
                <option value="65">Cold gas → 65s</option>
                <option value="220">Hydrazine → 220s</option>
                <option value="310">Bipropellant → 310s</option>
                <option value="1600">Ion thruster → 1600s</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', color: '#7986cb', fontSize: '10px', marginBottom: '4px' }}>Monthly fuel budget (kg)</label>
              <input
                type="number" value={monthlyFuel} onChange={e => setMonthlyFuel(e.target.value)}
                style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid #1a2845', color: '#fff', padding: '6px', borderRadius: '4px', fontSize: '11px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', color: '#7986cb', fontSize: '10px', marginBottom: '4px' }}>Total fuel (kg)</label>
              <input
                type="number" value={totalFuel} onChange={e => setTotalFuel(e.target.value)}
                style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid #1a2845', color: '#fff', padding: '6px', borderRadius: '4px', fontSize: '11px' }}
              />
            </div>
          </div>

          <button
            onClick={calculateSustained}
            disabled={loadingSustained}
            style={{ width: '100%', padding: '8px', background: 'rgba(0, 230, 118, 0.1)', color: '#00e676', border: '1px solid rgba(0, 230, 118, 0.3)', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', marginBottom: '16px' }}
          >
            <Rocket size={12} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
            {loadingSustained ? 'SIMULATING...' : 'CALCULATE SUSTAINED LIFETIME'}
          </button>

          {sustainedResult && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px' }}>
                  <div style={{ fontSize: '10px', color: '#7986cb' }}>Maintained for</div>
                  <div style={{ fontSize: '12px', color: '#00e676', fontWeight: 'bold' }}>{sustainedResult.maintained_months} months</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px' }}>
                  <div style={{ fontSize: '10px', color: '#7986cb' }}>Total mission life</div>
                  <div style={{ fontSize: '12px', color: '#fff', fontWeight: 'bold' }}>{sustainedResult.reentry_years.toFixed(1)} years</div>
                </div>
              </div>

              <div style={{ height: '200px', width: '100%' }} role="img" aria-label="Line chart showing sustained orbit decay curve">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formatChartData(sustainedResult.decay_curve)} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2845" vertical={false} />
                    <XAxis
                      dataKey="years"
                      stroke="#4a5568"
                      tick={{ fill: '#7986cb', fontSize: 10 }}
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={(val) => `${val}y`}
                    />
                    <YAxis
                      stroke="#4a5568"
                      tick={{ fill: '#7986cb', fontSize: 10 }}
                      domain={[0, Math.ceil(currentAlt / 100) * 100]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={120} stroke="#E24B4A" strokeDasharray="3 3" label={{ position: 'top', value: 'reentry', fill: '#E24B4A', fontSize: 10 }} />

                    {/* Recharts limitation: to color code a single line by phase we either need multiple lines or a gradient.
                        We will use multiple lines keyed by phase to map to the colors requested */}
                    <Line type="monotone" dataKey={(d) => d.phase === 'maintained' ? d.altitude_km : null} stroke="#00e676" strokeWidth={2} dot={false} connectNulls />
                    <Line type="monotone" dataKey={(d) => d.phase === 'partial' ? d.altitude_km : null} stroke="#ffcc00" strokeWidth={2} dot={false} connectNulls />
                    <Line type="monotone" dataKey={(d) => d.phase === 'natural' ? d.altitude_km : null} stroke="#E24B4A" strokeWidth={2} dot={false} connectNulls />

                    {sustainedResult.fuel_exhausted_day && (
                      <ReferenceLine
                        x={Number((sustainedResult.fuel_exhausted_day / 365.25).toFixed(2))}
                        stroke="#7986cb"
                        strokeDasharray="3 3"
                        label={{ value: 'fuel exhausted', position: 'insideTopLeft', fill: '#7986cb', fontSize: 9 }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
