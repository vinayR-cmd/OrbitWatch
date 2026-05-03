import React, { useContext, useState } from 'react';
import axios from 'axios';
import { Shield, ArrowDown, Rocket, CheckCircle, Calculator } from 'lucide-react';
import { MissionContext } from '../../context/MissionContext';
import { formatPc, formatDistance, formatTime } from '../../utils/format';
import { API_ENDPOINTS } from '../../config/api';

export const SafeRouting: React.FC = () => {
  const context = useContext(MissionContext);
  const [showPlan, setShowPlan] = useState(false);
  
  // Fuel calculator states
  const [dryMassKg, setDryMassKg] = useState<string>('');
  const [ispSeconds, setIspSeconds] = useState<string>('220');
  const [customIsp, setCustomIsp] = useState<string>('');
  const [currentFuelKg, setCurrentFuelKg] = useState<string>('');
  const [fuelResult, setFuelResult] = useState<any>(null);
  const [isCalculatingFuel, setIsCalculatingFuel] = useState(false);
  const [fuelError, setFuelError] = useState<string | null>(null);
  if (!context || !context.analysisResult) return null;

  const highRisk = context.analysisResult.conjunctions.filter(c => c.action === 'MANEUVER');

  if (highRisk.length === 0) {
    return (
      <div className="w-full">
        <div className="flex items-center gap-2 mb-4 text-text-secondary">
          <Shield size={16} />
          <span className="text-[10px] text-[#4a5568] font-[500] uppercase tracking-[0.12em]">Safe Routing</span>
        </div>
        <div className="flex items-center gap-2 p-4 bg-accent-green/10 rounded border border-accent-green/20">
          <CheckCircle className="text-accent-green" size={20} />
          <span className="text-accent-green text-sm font-bold">No maneuver required</span>
        </div>
      </div>
    );
  }

  // Pick top risk
  const event = highRisk[0];
  const tcaDate = new Date(event.tcaTime);
  const maneuverDate = new Date(tcaDate.getTime() - 6 * 3600000); // 6 hours before
  
  // Realistic Astrodynamics Approximation:
  // Along-track drift delta_s = 3 * delta_v * time
  // Target a safe distance of at least 10km (or current + 5km)
  const targetSafeDistanceKm = Math.max(10.0, event.missDistanceKm + 5.0);
  const requiredDisplacementKm = Math.abs(targetSafeDistanceKm - event.missDistanceKm);
  const timeSeconds = 6 * 3600; // 6 hours before TCA
  
  const dvMetersPerSec = (requiredDisplacementKm * 1000) / (3 * timeSeconds);
  const dv = dvMetersPerSec.toFixed(3);
  const newDist = targetSafeDistanceKm.toFixed(2);
  // Probability of collision drops exponentially with increased distance
  const newPc = Math.max(1e-8, event.pc * Math.exp(-requiredDisplacementKm / 2.0));


  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-4 text-text-secondary">
        <Shield size={16} />
        <span className="text-[10px] text-[#4a5568] font-[500] uppercase tracking-[0.12em]">Safe Routing</span>
      </div>

      <div className="bg-[#0c1120] border border-[#1a2845] rounded-[10px] p-4 mb-2">
        <div className="text-sm font-bold text-accent-red mb-2">{event.name}</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="text-text-secondary">TCA:</div>
          <div className="text-text-primary text-right">{formatTime(event.tcaTime)}</div>
          <div className="text-text-secondary">Miss Dist:</div>
          <div className="text-text-primary text-right">{formatDistance(event.missDistanceKm)}</div>
          <div className="text-text-secondary">Current Pc:</div>
          <div className="text-text-primary text-right font-mono">{formatPc(event.pc)}</div>
        </div>
      </div>

      <div className="flex justify-center my-2 text-text-secondary">
        <ArrowDown size={16} />
        <span className="text-[10px] uppercase font-bold tracking-widest ml-2">Suggested Maneuver</span>
      </div>

      <div className="bg-[#0c1120] border border-[#1a2845] rounded-[10px] p-4 mb-4">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="text-text-secondary">Maneuver Time:</div>
          <div className="text-accent-green font-bold text-right">T - 6h ({formatTime(maneuverDate.toISOString())})</div>
          <div className="text-text-secondary">Delta-V:</div>
          <div className="text-text-primary text-right">{dv} m/s</div>
          <div className="text-text-secondary">Est. New Dist:</div>
          <div className="text-text-primary text-right">{newDist} km</div>
          <div className="text-text-secondary">Est. New Pc:</div>
          <div className="text-accent-green font-mono text-right">{formatPc(newPc)}</div>
        </div>
      </div>

      <button 
        onClick={() => setShowPlan(true)}
        className="w-full flex items-center justify-center gap-2 bg-[#00e676] text-[#050810] font-[700] h-[40px] rounded-[8px] hover:bg-[#00e676]/80 transition-colors shadow-none border-none cursor-pointer"
      >
        <Rocket size={18} />
        PLAN MANEUVER
      </button>

      {showPlan && event && (
        <div style={{
          marginTop: '16px',
          backgroundColor: '#0c1120',
          border: '1px solid #1a2845',
          borderRadius: '10px',
          padding: '16px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}>
            <span style={{ 
              color: '#00e676', 
              fontSize: '12px', 
              letterSpacing: '0.08em',
              fontWeight: 500,
            }}>
              MANEUVER PLAN GENERATED
            </span>
            <button
              onClick={() => setShowPlan(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#7986cb',
                cursor: 'pointer',
                fontSize: '16px',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          {[
            {
              label: 'Maneuver execution time',
              value: `T + ${Math.max(0, (
                (new Date(event.tcaTime).getTime() - Date.now()) / 3600000
              ) - 6).toFixed(1)}h before TCA`,
              color: '#00e5ff',
            },
            {
              label: 'Burn direction',
              value: 'Prograde (+V-bar)',
              color: '#e8eaf6',
            },
            {
              label: 'Delta-V required',
              value: `${dv} m/s`,
              color: '#00e5ff',
            },
            {
              label: 'New predicted miss distance',
              value: `${newDist} km`,
              color: '#00e676',
            },
            {
              label: 'New Pc after maneuver',
              value: formatPc(newPc),
              color: '#00e676',
            },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 0',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              fontSize: '12px',
            }}>
              <span style={{ color: '#7986cb' }}>{label}</span>
              <span style={{ color, fontVariantNumeric: 'tabular-nums' }}>
                {value}
              </span>
            </div>
          ))}

          <div style={{
            marginTop: '12px',
            display: 'flex',
            gap: '8px',
          }}>
            <button
              onClick={() => {
                const plan = {
                  object: event.name,
                  noradId: event.noradId,
                  tcaTime: event.tcaTime,
                  currentMissDistance: event.missDistanceKm,
                  currentPc: event.pc,
                  deltaV: Number(dv),
                  newMissDistance: Number(newDist),
                  newPc: newPc,
                  generatedAt: new Date().toISOString(),
                };
                const blob = new Blob([JSON.stringify(plan, null, 2)], { 
                  type: 'application/json' 
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `maneuver_plan_${event.noradId}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: 'rgba(0, 230, 118, 0.15)',
                border: '1px solid rgba(0, 230, 118, 0.4)',
                borderRadius: '6px',
                color: '#00e676',
                fontSize: '11px',
                cursor: 'pointer',
                letterSpacing: '0.05em',
              }}
            >
              EXPORT JSON
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `MANEUVER PLAN\nObject: ${event.name}\n` +
                  `TCA: ${event.tcaTime}\n` +
                  `Delta-V: ${dv} m/s\n` +
                  `New miss distance: ${newDist} km`
                );
              }}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: 'rgba(0, 229, 255, 0.1)',
                border: '1px solid rgba(0, 229, 255, 0.3)',
                borderRadius: '6px',
                color: '#00e5ff',
                fontSize: '11px',
                cursor: 'pointer',
                letterSpacing: '0.05em',
              }}
            >
              COPY TO CLIPBOARD
            </button>
          </div>

          {/* Fuel Calculator */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <h4 style={{ color: '#00e5ff', fontSize: '11px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calculator size={14} /> Fuel cost calculator
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Input 1: Dry mass */}
              <div>
                <label style={{ display: 'block', color: '#7986cb', fontSize: '10px', marginBottom: '4px' }}>Dry mass (kg)</label>
                <input 
                  type="number" 
                  min="1"
                  value={dryMassKg}
                  onChange={e => setDryMassKg(e.target.value)}
                  placeholder="e.g. 420000 for ISS, 260 for Starlink"
                  style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid #1a2845', color: '#fff', padding: '6px 8px', borderRadius: '4px', fontSize: '11px' }}
                />
              </div>

              {/* Input 2: Thruster type */}
              <div>
                <label style={{ display: 'block', color: '#7986cb', fontSize: '10px', marginBottom: '4px' }}>Thruster type</label>
                <select 
                  value={ispSeconds}
                  onChange={e => setIspSeconds(e.target.value)}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid #1a2845', color: '#fff', padding: '6px 8px', borderRadius: '4px', fontSize: '11px' }}
                >
                  <option value="65">Cold gas (N2) → Isp = 65s</option>
                  <option value="220">Hydrazine mono → Isp = 220s</option>
                  <option value="310">Bipropellant → Isp = 310s</option>
                  <option value="1600">Hall ion thruster → Isp = 1600s</option>
                  <option value="custom">Custom Isp...</option>
                </select>
                {ispSeconds === 'custom' && (
                  <input 
                    type="number" 
                    min="1"
                    value={customIsp}
                    onChange={e => setCustomIsp(e.target.value)}
                    placeholder="Enter custom Isp (seconds)"
                    style={{ width: '100%', marginTop: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid #1a2845', color: '#fff', padding: '6px 8px', borderRadius: '4px', fontSize: '11px' }}
                  />
                )}
              </div>

              {/* Input 3: Current fuel (optional) */}
              <div>
                <label style={{ display: 'block', color: '#7986cb', fontSize: '10px', marginBottom: '4px' }}>Current fuel onboard (kg) — optional</label>
                <input 
                  type="number" 
                  min="0"
                  value={currentFuelKg}
                  onChange={e => setCurrentFuelKg(e.target.value)}
                  placeholder="Leave blank if unknown"
                  style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid #1a2845', color: '#fff', padding: '6px 8px', borderRadius: '4px', fontSize: '11px' }}
                />
              </div>

              <button
                onClick={async () => {
                  if (!dryMassKg) return;
                  const finalIsp = ispSeconds === 'custom' ? customIsp : ispSeconds;
                  if (!finalIsp) return;
                  
                  setIsCalculatingFuel(true);
                  setFuelError(null);
                  try {
                    const payload: any = {
                      delta_v_ms: Number(dv),
                      dry_mass_kg: Number(dryMassKg),
                      isp_seconds: Number(finalIsp)
                    };
                    if (currentFuelKg) {
                      payload.current_fuel_kg = Number(currentFuelKg);
                    }
                    
                    if (context.isDemoMode) {
                      const g0 = 9.80665;
                      const deltaV = Number(dv);
                      const isp = Number(finalIsp);
                      const dryMass = Number(dryMassKg);
                      const exponent = deltaV / (isp * g0);
                      const fuelBurned = dryMass * (Math.exp(exponent) - 1);
                      
                      const resData: any = {
                        delta_v_ms: deltaV,
                        fuel_burned_kg: fuelBurned,
                        dry_mass_kg: dryMass,
                        isp_seconds: isp,
                        exponent_check: exponent
                      };
                      
                      if (currentFuelKg) {
                        const curr = Number(currentFuelKg);
                        const remaining = curr - fuelBurned;
                        resData.current_fuel_kg = curr;
                        resData.remaining_fuel_kg = remaining;
                        resData.fuel_remaining_pct = (remaining / curr) * 100;
                        resData.sufficient_fuel = remaining >= 0;
                        if (remaining < 0) resData.fuel_deficit_kg = Math.abs(remaining);
                      }
                      
                      // Simulate a tiny network delay for the UI state
                      await new Promise(r => setTimeout(r, 400));
                      setFuelResult(resData);
                    } else {
                      const res = await axios.post(API_ENDPOINTS.maneuverFuelCost, payload);
                      setFuelResult(res.data);
                    }
                  } catch (err: any) {
                    setFuelError(err.message || 'Failed to calculate fuel');
                  } finally {
                    setIsCalculatingFuel(false);
                  }
                }}
                disabled={isCalculatingFuel || !dryMassKg || (ispSeconds === 'custom' && !customIsp)}
                style={{ width: '100%', padding: '8px', background: 'rgba(0, 229, 255, 0.1)', color: '#00e5ff', border: '1px solid rgba(0, 229, 255, 0.3)', borderRadius: '4px', cursor: isCalculatingFuel || !dryMassKg ? 'not-allowed' : 'pointer', fontSize: '11px', marginTop: '4px', opacity: (isCalculatingFuel || !dryMassKg || (ispSeconds === 'custom' && !customIsp)) ? 0.5 : 1 }}
              >
                {isCalculatingFuel ? 'CALCULATING...' : 'Calculate fuel cost'}
              </button>
              
              {fuelError && <div style={{ color: '#ff5252', fontSize: '10px' }}>{fuelError}</div>}
              
              {fuelResult && (
                <div style={{ 
                  marginTop: '8px', 
                  padding: '10px', 
                  background: 'rgba(0,0,0,0.3)', 
                  borderRadius: '6px',
                  border: fuelResult.sufficient_fuel === false ? '1px solid #ff5252' : '1px solid rgba(255,255,255,0.1)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                    <span style={{ color: '#7986cb' }}>Fuel burned:</span>
                    <span style={{ color: '#fff' }}>
                      {fuelResult.fuel_burned_kg < 1 ? fuelResult.fuel_burned_kg.toFixed(4) : fuelResult.fuel_burned_kg.toFixed(2)} kg
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                    <span style={{ color: '#7986cb' }}>Mass before:</span>
                    <span style={{ color: '#fff' }}>{(fuelResult.dry_mass_kg + (fuelResult.current_fuel_kg || fuelResult.fuel_burned_kg)).toFixed(1)} kg</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '8px' }}>
                    <span style={{ color: '#7986cb' }}>Mass after:</span>
                    <span style={{ color: '#fff' }}>{(fuelResult.dry_mass_kg + (fuelResult.current_fuel_kg ? fuelResult.remaining_fuel_kg : 0)).toFixed(1)} kg</span>
                  </div>
                  
                  {fuelResult.current_fuel_kg !== undefined && (
                    <>
                      <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '6px 0' }}></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                        <span style={{ color: '#7986cb' }}>Remaining fuel:</span>
                        <span style={{ color: '#fff' }}>
                          {fuelResult.remaining_fuel_kg < 1 ? fuelResult.remaining_fuel_kg.toFixed(4) : fuelResult.remaining_fuel_kg.toFixed(2)} kg 
                          <span style={{ color: '#7986cb', marginLeft: '4px' }}>({fuelResult.fuel_remaining_pct.toFixed(1)}% of total)</span>
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                        <span style={{ color: '#7986cb' }}>Status:</span>
                        <span style={{ color: fuelResult.sufficient_fuel ? '#00e676' : '#ff5252', fontWeight: 600 }}>
                          {fuelResult.sufficient_fuel 
                            ? 'Sufficient fuel' 
                            : `Insufficient — need ${fuelResult.fuel_deficit_kg < 1 ? fuelResult.fuel_deficit_kg.toFixed(4) : fuelResult.fuel_deficit_kg.toFixed(2)} kg more`
                          }
                        </span>
                      </div>
                      {fuelResult.sufficient_fuel === false && (
                        <div style={{ marginTop: '8px', padding: '6px', background: 'rgba(255,82,82,0.1)', color: '#ff5252', fontSize: '10px', textAlign: 'center', borderRadius: '4px' }}>
                          Maneuver not possible with current fuel load
                        </div>
                      )}
                    </>
                  )}
                  
                  <div style={{ marginTop: '12px', fontSize: '9px', color: '#4f5b7d', textAlign: 'center' }}>
                    <div>Formula: m_fuel = m_dry × (e^(Δv/Isp×g₀) − 1)</div>
                    <div>Tsiolkovsky rocket equation</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <p style={{
            marginTop: '10px',
            fontSize: '10px',
            color: '#7986cb',
            textAlign: 'center',
            fontStyle: 'italic',
          }}>
            This is an estimate, please verify it.
          </p>
        </div>
      )}

      {/* Hide the following text when the plan is shown as it is redundant */}
      {!showPlan && (
        <p className="text-[10px] text-text-secondary text-center mt-3">
          This is an estimate, please verify it.
        </p>
      )}
    </div>
  );
};
