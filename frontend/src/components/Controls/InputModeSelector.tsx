import React, { useContext } from 'react';
import { Rocket, Satellite } from 'lucide-react';
import { MissionContext } from '../../context/MissionContext';

export const InputModeSelector: React.FC = () => {
  const context = useContext(MissionContext);
  if (!context) return null;
  const { missionInput, setMissionInput } = context;

  const activeMode = missionInput?.mode || 'norad';

  return (
    <div className="flex w-full mb-4 gap-2">
      <button 
        className={`flex-1 py-3 px-2 flex flex-col items-center justify-center rounded transition-all duration-150 border-2 ${
          activeMode === 'prelaunch' 
            ? 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan' 
            : 'border-space-border text-text-secondary hover:border-text-secondary'
        }`}
        onClick={() => setMissionInput({ mode: 'prelaunch' })}
      >
        <Rocket size={20} className="mb-1" />
        <span className="text-[11px] font-bold uppercase tracking-wider">Pre-launch</span>
      </button>
      
      <button 
        className={`flex-1 py-3 px-2 flex flex-col items-center justify-center rounded transition-all duration-150 border-2 ${
          activeMode === 'norad' 
            ? 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan' 
            : 'border-space-border text-text-secondary hover:border-text-secondary'
        }`}
        onClick={() => setMissionInput({ mode: 'norad' })}
      >
        <Satellite size={20} className="mb-1" />
        <span className="text-[11px] font-bold uppercase tracking-wider">Active Satellite</span>
      </button>
    </div>
  );
};
