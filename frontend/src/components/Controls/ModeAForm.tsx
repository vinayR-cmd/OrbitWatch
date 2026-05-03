import React, { useState, useContext } from 'react';
import { MissionContext } from '../../context/MissionContext';
import { useAnalysis } from '../../hooks/useAnalysis';

export const ModeAForm: React.FC = () => {
  const context = useContext(MissionContext);
  const { analyze, isLoading } = useAnalysis();
  
  if (!context) return null;
  const { setMissionInput } = context;

  const [name, setName] = useState('');
  const [apogee, setApogee] = useState('550');
  const [perigee, setPerigee] = useState('550');
  const [inc, setInc] = useState('');
  const [raan, setRaan] = useState('0');
  const [argPerigee, setArgPerigee] = useState('0');
  const [meanAnomaly, setMeanAnomaly] = useState('0');
  const [bstar, setBstar] = useState('0.0001');
  const [time, setTime] = useState('');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  
  const eccentricity = React.useMemo(() => {
    const apo = parseFloat(apogee);
    const peri = parseFloat(perigee);
    if (isNaN(apo) || isNaN(peri)) return null;
    const ra = 6371 + apo;
    const rp = 6371 + peri;
    return (ra - rp) / (ra + rp);
  }, [apogee, perigee]);
  
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = () => {
    const errs: { [key: string]: string } = {};
    if (!name) errs.name = "Required";
    
    const apoNum = parseFloat(apogee);
    const periNum = parseFloat(perigee);
    
    if (!apogee || isNaN(apoNum) || apoNum < 200 || apoNum > 36000) {
      errs.apogee = "Apogee must be between 200 and 36,000 km";
    }
    if (!perigee || isNaN(periNum) || periNum < 200 || periNum > 36000) {
      errs.perigee = "Perigee must be between 200 and 36,000 km";
    }
    if (periNum > apoNum) {
      errs.perigee = "Perigee cannot be strictly greater than Apogee";
    }
    
    const incNum = parseFloat(inc);
    if (!inc || isNaN(incNum) || incNum < 0 || incNum > 180) {
      errs.inc = "Inclination must be between 0° and 180°";
    }
    
    if (!time) {
      errs.time = "Required";
    } else if (new Date(time).getTime() < Date.now()) {
      errs.time = "Launch time must be in the future";
    }
    
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      const newInput = {
        mode: 'prelaunch' as const,
        missionName: name,
        apogeeKm: parseFloat(apogee),
        perigeeKm: parseFloat(perigee),
        inclinationDeg: parseFloat(inc),
        launchTime: new Date(time).toISOString(),
        raanDeg: parseFloat(raan),
        argPerigeeDeg: parseFloat(argPerigee),
        meanAnomalyDeg: parseFloat(meanAnomaly),
        bstar: parseFloat(bstar)
      };
      setMissionInput(newInput);
      analyze(newInput);
    }
  };

  const inputClass = `w-full bg-[#080d1c] border border-[#1a2845] text-[#e8eaf6] p-[8px] px-[10px] rounded-[7px] text-[11px] focus:outline-none focus:border-[rgba(0,229,255,0.5)] transition-colors`;
  const labelClass = `block text-[9px] text-[#546e7a] tracking-[0.08em] mb-[3px] uppercase`;

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <div>
        <label className={labelClass}>Mission Name</label>
        <input 
          className={`${inputClass} ${errors.name ? '!border-[#f44336]' : ''}`}
          placeholder="e.g. MyMission-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {errors.name && <span className="text-[#f44336] text-[11px] block mt-1">{errors.name}</span>}
      </div>
      
      <div className="flex gap-2">
        <div className="flex-1">
          <label className={labelClass}>Apogee Alt. (km)</label>
          <input 
            type="number"
            step="any"
            className={`${inputClass} ${errors.apogee ? '!border-[#f44336]' : ''}`}
            placeholder="200 - 36,000"
            value={apogee}
            onChange={(e) => setApogee(e.target.value)}
          />
          {errors.apogee && <span className="text-[#f44336] text-[11px] block mt-1">{errors.apogee}</span>}
        </div>
        
        <div className="flex-1">
          <label className={labelClass}>Perigee Alt. (km)</label>
          <input 
            type="number"
            step="any"
            className={`${inputClass} ${errors.perigee ? '!border-[#f44336]' : ''}`}
            placeholder="200 - 36,000"
            value={perigee}
            onChange={(e) => setPerigee(e.target.value)}
          />
          {errors.perigee && <span className="text-[#f44336] text-[11px] block mt-1">{errors.perigee}</span>}
        </div>
      </div>
      
      <p className="text-[10px] text-[#546e7a] -mt-1 leading-snug">
        For circular orbit set both equal. ISS example: apogee 422 km, perigee 418 km.
      </p>

      {eccentricity !== null && !errors.apogee && !errors.perigee && (
        <div className="bg-[rgba(0,229,255,0.05)] border border-[rgba(0,229,255,0.15)] rounded text-[11px] px-2 py-1 text-[#00e5ff] font-mono">
          Eccentricity: {eccentricity.toFixed(5)} {eccentricity < 0.005 ? '(nearly circular)' : '(elliptical)'}
        </div>
      )}

      <div>
        <label className={labelClass}>Inclination (°)</label>
        <input 
          type="number"
          step="any"
          className={`${inputClass} ${errors.inc ? '!border-[#f44336]' : ''}`}
          placeholder="0 - 180"
          value={inc}
          onChange={(e) => setInc(e.target.value)}
        />
        {errors.inc && <span className="text-[#f44336] text-[11px] block mt-1">{errors.inc}</span>}
      </div>

      <div className="bg-[#0f1629] border border-[#1a2845] rounded-[8px] overflow-hidden">
        <button
          type="button"
          className="w-full px-3 py-2 text-left flex items-center justify-between focus:outline-none hover:bg-[rgba(0,229,255,0.05)] transition-colors border-b border-transparent data-[open=true]:border-[rgba(0,229,255,0.2)]"
          data-open={isAdvancedOpen}
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
        >
          <span className="text-[10px] text-[#00e5ff] uppercase tracking-wider font-semibold">Advanced Orbital Elements</span>
          <span className="text-[#00e5ff] text-xs font-mono">{isAdvancedOpen ? '▼' : '▶'}</span>
        </button>
        
        {isAdvancedOpen && (
          <div className="p-3 flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className={labelClass}>RAAN (°)</label>
                <input type="number" step="any" min="0" max="360" className={inputClass} value={raan} onChange={e => setRaan(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className={labelClass}>Arg. of Perigee (°)</label>
                <input type="number" step="any" min="0" max="360" className={inputClass} value={argPerigee} onChange={e => setArgPerigee(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className={labelClass}>Mean Anomaly (°)</label>
                <input type="number" step="any" min="0" max="360" className={inputClass} value={meanAnomaly} onChange={e => setMeanAnomaly(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className={labelClass}>B* Drag Term</label>
                <input type="number" step="0.00001" className={inputClass} value={bstar} onChange={e => setBstar(e.target.value)} />
              </div>
            </div>
            <p className="text-[9px] text-[#546e7a] leading-snug">
              RAAN, Arg. of Perigee, and Mean Anomaly define WHERE in its orbit the satellite starts. Default 0 is valid for planning purposes.
            </p>
          </div>
        )}
      </div>
      
      <div>
        <label className={labelClass}>Launch Time</label>
        <input 
          type="datetime-local"
          className={`${inputClass} ${errors.time ? '!border-[#f44336]' : ''}`}
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
        {errors.time && <span className="text-[#f44336] text-[11px] block mt-1">{errors.time}</span>}
      </div>
      
      <button 
        type="submit"
        disabled={isLoading}
        className="w-full bg-[#00e5ff] text-[#050810] font-[700] text-[12px] tracking-[0.08em] h-[40px] rounded-[8px] mt-2 hover:bg-[#00e5ff]/80 transition-colors disabled:opacity-50 shadow-none border-none cursor-pointer"
      >
        {isLoading ? "ANALYZING..." : "ANALYZE MISSION"}
      </button>
    </form>
  );
};
