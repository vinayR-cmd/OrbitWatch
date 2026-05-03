import React, { useState, useContext } from 'react';
import { MissionContext } from '../../context/MissionContext';
import { useAnalysis } from '../../hooks/useAnalysis';

export const ModeBForm: React.FC = () => {
  const context = useContext(MissionContext);
  const { analyze, isLoading } = useAnalysis();
  
  if (!context) return null;
  const { setMissionInput, backendConnected } = context;

  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const validate = () => {
    if (!input) {
      setError("Please enter a valid NORAD ID");
      return false;
    }
    const num = parseInt(input, 10);
    if (isNaN(num) || num < 0) {
      setError("Please enter a valid NORAD ID");
      return false;
    }
    setError('');
    return true;
  };

  const handleSetPreset = (val: string) => {
    setInput(val);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      const newInput = {
        mode: 'norad' as const,
        noradId: parseInt(input, 10)
      };
      setMissionInput(newInput);
      analyze(newInput);
    }
  };

  const inputClass = `w-full bg-[#080d1c] border border-[#1a2845] text-[#e8eaf6] p-[8px] px-[10px] rounded-[7px] text-[11px] focus:outline-none focus:border-[rgba(0,229,255,0.5)] transition-colors`;
  const labelClass = `block text-[9px] text-[#546e7a] tracking-[0.08em] mb-[3px] uppercase`;
  const presetClass = `text-[10px] bg-[rgba(0,229,255,0.06)] border border-[rgba(0,229,255,0.2)] h-[26px] px-[8px] rounded-[5px] text-[#00e5ff] hover:opacity-80 transition-opacity`;

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <div>
        <label className={labelClass}>Object Identifier</label>
        <input 
          className={`${inputClass} ${error ? '!border-[#f44336]' : ''}`}
          placeholder="NORAD ID (e.g. 25544)"
          value={input}
          onChange={(e) => setInput(e.target.value.replace(/[^0-9]/g, ''))}
        />
        {error && <span className="text-[#f44336] text-[11px] block mt-1">{error}</span>}
      </div>
      
      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={() => handleSetPreset('25544')} className={presetClass}>ISS · 25544</button>
        <button type="button" onClick={() => handleSetPreset('20580')} className={presetClass}>Hubble · 20580</button>
      </div>
      
      <div className="mt-2 text-center">
        <button 
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#00e5ff] text-[#050810] font-[700] text-[12px] tracking-[0.08em] h-[40px] rounded-[8px] hover:bg-[#00e5ff]/80 transition-colors disabled:opacity-50 shadow-none border-none cursor-pointer"
        >
          {isLoading ? "ANALYZING..." : "ANALYZE"}
        </button>
        
        {!backendConnected && (
          <div className="mt-2 text-[11px] text-accent-yellow bg-accent-yellow/10 p-1 rounded">
            Using demo data — backend offline
          </div>
        )}
      </div>
    </form>
  );
};
