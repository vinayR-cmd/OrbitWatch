import React, { useContext } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { MissionContext } from '../../context/MissionContext';
import { formatCountdown } from '../../utils/format';

export const AlertBanner: React.FC = () => {
  const context = useContext(MissionContext);
  const [dismissed, setDismissed] = React.useState(false);
  
  // Reset dismissed state when a new analysis result comes in
  React.useEffect(() => {
    setDismissed(false);
  }, [context?.analysisResult]);

  if (!context) return null;
  const { analysisResult } = context;

  if (!analysisResult || dismissed) return null;
  
  const highRiskEvents = analysisResult.conjunctions.filter(c => c.action === 'MANEUVER');
  if (highRiskEvents.length === 0) return null;

  // Assuming sorted by highest PC first
  const topEvent = highRiskEvents[0];
  const countdown = formatCountdown(topEvent.tcaTime);

  return (
    <div className="w-full bg-[rgba(244,67,54,0.10)] border-l-[3px] border-l-[#f44336] rounded-r-[8px] px-4 py-3 flex items-center justify-between animate-[pulse_2s_ease-in-out_infinite] transition-transform duration-300">
      <div className="flex items-center gap-3">
        <AlertTriangle className="text-accent-orange animate-[shake_0.5s_infinite]" size={20} />
        <div className="flex flex-col">
          <span className="text-[13px] font-[700] text-[#f44336]">COLLISION RISK DETECTED ({highRiskEvents.length})</span>
          <span className="text-[11px] text-[#ff7043] font-[400]">
            {topEvent.name} · TCA in {countdown}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button 
          onClick={() => {
            const table = document.getElementById("routing-panel");
            if (table) table.scrollIntoView({ behavior: 'smooth' });
          }}
          className="text-[11px] font-bold text-text-primary bg-[#ffffff1a] px-3 py-1.5 rounded hover:bg-[#ffffff33] transition-colors"
        >
          View Details
        </button>
        <button 
          onClick={() => setDismissed(true)}
          className="text-text-secondary hover:text-[#fff]"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
