import React, { useContext, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';
import { MissionContext } from '../../context/MissionContext';

export const TimeScrubber: React.FC = () => {
  const context = useContext(MissionContext);
  if (!context) return null;
  const { simulation, setSimulation } = context;
  const lastTickRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!simulation.isPlaying) {
      return;
    }

    lastTickRef.current = Date.now();
    
    const tick = () => {
      const now = Date.now();
      const deltaTimeMs = now - lastTickRef.current;
      lastTickRef.current = now;

      setSimulation((prev) => {
        if (!prev.isPlaying) return prev;
        
        // Speed 1 = 1 hour of simulation time per 1 real second
        // deltaHours = (ms / 1000) * speed
        const deltaHours = (deltaTimeMs / 1000) * prev.speed;
        const nextHour = Math.min(72, Math.max(0, prev.currentHour + deltaHours));
        
        if (nextHour >= 72) {
          return { ...prev, currentHour: 0, isPlaying: false };
        }
        
        return { ...prev, currentHour: nextHour };
      });
    };

    const interval = setInterval(tick, 100); // UI update frequency
    return () => clearInterval(interval);
  }, [simulation.isPlaying, simulation.speed, setSimulation]);

  const setSpeed = (s: 0.5 | 1 | 10) => {
    setSimulation(prev => ({ ...prev, speed: s }));
  };

  const togglePlay = () => {
    setSimulation(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };
  
  const progressPercent = (simulation.currentHour / 72) * 100;

  return (
    <div className="flex flex-col gap-3">
      <div style={{ 
        color: '#00e5ff', 
        fontSize: '13px', 
        fontVariantNumeric: 'tabular-nums',
        marginBottom: '8px',
        fontWeight: 500
      }}>
        T + {simulation.currentHour.toFixed(2)}h 
        &nbsp;·&nbsp; 
        {new Date(Date.now() + simulation.currentHour * 3600000)
          .toUTCString()
          .slice(0, 25)} UTC
      </div>
      
      {/* Track Slider */}
      <div className="relative w-full h-2 bg-space-card rounded-full mt-2">
        <div 
          className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-accent-cyan to-accent-orange"
          style={{ width: `${progressPercent}%` }}
        />
        <input 
          type="range"
          min="0" max="72" step="0.01"
          value={simulation.currentHour}
          onChange={(e) => {
            const val = Number(e.target.value);
            setSimulation(prev => ({ ...prev, currentHour: val }));
          }}
          className="absolute top-[-5px] left-0 w-full h-4 opacity-0 cursor-pointer"
        />
        <div 
          className="absolute top-[-4px] w-4 h-4 bg-[#fff] rounded-full shadow pointer-events-none transition-transform"
          style={{ left: `calc(${progressPercent}% - 8px)` }}
        />
      </div>
      
      <div className="flex justify-between items-center mt-2">
        <button 
          onClick={togglePlay}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-space-card border border-space-border hover:border-accent-cyan transition-colors"
        >
          {simulation.isPlaying ? <Pause size={14} className="text-accent-cyan" /> : <Play size={14} className="text-accent-green" />}
        </button>
        
        <div className="flex gap-1">
          {([0.5, 1, 10] as const).map(s => {
            return (
              <button 
                key={s}
                onClick={() => setSpeed(s)}
                className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${simulation.speed === s ? 'bg-accent-cyan/20 text-accent-cyan' : 'text-text-secondary hover:text-text-primary'}`}
              >
                {s}×
              </button>
            )
          })}
          <button className="text-[10px] font-bold px-2 py-1 rounded text-text-secondary hover:text-accent-red">LIVE</button>
        </div>
      </div>
    </div>
  );
};
