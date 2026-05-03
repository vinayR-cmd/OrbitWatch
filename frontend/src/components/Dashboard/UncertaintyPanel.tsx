import React from 'react';
import { Info } from 'lucide-react';

export const UncertaintyPanel: React.FC = () => {
  return (
    <div className="bg-[#0c1120] rounded-[10px] p-4 border border-[#1a2845]">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[10px] text-[#4a5568] font-[500] uppercase tracking-[0.12em]">Position Uncertainty (1σ)</span>
        <Info size={12} className="text-text-secondary" />
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm mb-6">
        <div className="text-text-secondary border-l-2 border-l-accent-cyan pl-2">Radial (R):</div>
        <div className="text-text-primary text-right">± 0.10 km</div>
        
        <div className="text-text-secondary border-l-2 border-l-accent-yellow pl-2">In-track (I):</div>
        <div className="text-text-primary text-right">± 0.31 km</div>
        
        <div className="text-text-secondary border-l-2 border-l-accent-cyan pl-2">Cross-track (C):</div>
        <div className="text-text-primary text-right">± 0.05 km</div>
      </div>
      
      <div className="flex justify-center mb-4 opacity-70">
        <svg width="200" height="120" viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
          {/* C-axis */}
          <line x1="100" y1="20" x2="100" y2="100" stroke="#00e5ff" strokeWidth="1" strokeDasharray="2 2" />
          <text x="105" y="25" fill="#00e5ff" fontSize="10">C</text>
          
          {/* I-axis */}
          <line x1="20" y1="60" x2="180" y2="60" stroke="#ffea00" strokeWidth="1" strokeDasharray="2 2" />
          <text x="180" y="55" fill="#ffea00" fontSize="10">I</text>
          
          {/* Ellipsoid representing uncertainty */}
          <ellipse cx="100" cy="60" rx="60" ry="20" fill="transparent" stroke="#7986cb" strokeWidth="1" />
          <ellipse cx="100" cy="60" rx="30" ry="10" fill="transparent" stroke="#1e88e5" strokeWidth="1" />
        </svg>
      </div>
      
      <p className="text-[10px] text-text-secondary text-center">
        Based on TLE fit residuals. Covariance propagation in v2.0.
      </p>
    </div>
  );
};
