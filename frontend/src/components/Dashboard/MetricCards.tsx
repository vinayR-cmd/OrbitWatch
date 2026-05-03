import React, { useContext, useEffect, useState } from 'react';
import { MissionContext } from '../../context/MissionContext';
import { formatCountdown, formatDistance, formatPc, formatTime, getPcLabel, getPcColor } from '../../utils/format';

export const MetricCards: React.FC = () => {
  const context = useContext(MissionContext);
  if (!context) return null;
  const { analysisResult } = context;

  const [tick, setTick] = useState(0);

  useEffect(() => {
    const int = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(int);
  }, []);

  if (!analysisResult) return <div />;

  const highRiskCount = analysisResult.summary.highRiskCount;
  
  let closest = analysisResult.conjunctions[0];
  let maxPc = analysisResult.conjunctions[0];
  
  analysisResult.conjunctions.forEach(c => {
    if (c.missDistanceKm < closest.missDistanceKm) closest = c;
    if (c.pc > maxPc.pc) maxPc = c;
  });

  const nextTcaStr = analysisResult.summary.nextTca;
  const diffHours = nextTcaStr ? (new Date(nextTcaStr).getTime() - Date.now()) / 3600000 : 999;
  
  const Card = ({ label, value, subtitle, valueColor, showDot }: any) => (
    <div className="bg-[#0c1120] rounded-[10px] p-4 border border-[#1a2845] flex flex-col">
      <span className="text-[9px] text-[#546e7a] uppercase tracking-[0.10em] mb-2">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[32px] font-[700] tabular-nums" style={{ color: valueColor }}>{value}</span>
        {showDot && <span className="w-2.5 h-2.5 rounded-full bg-accent-red animate-pulse mt-1" />}
      </div>
      <span className="text-[12px] text-text-secondary mt-1">{subtitle}</span>
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card 
        label="High Risk Events" 
        value={highRiskCount} 
        subtitle="objects above Pc 1×10⁻⁴"
        valueColor={highRiskCount > 0 ? "var(--accent-red)" : "var(--accent-green)"}
        showDot={highRiskCount > 0}
      />
      <Card 
        label="Next TCA In" 
        value={formatCountdown(nextTcaStr)} 
        subtitle={nextTcaStr ? formatTime(nextTcaStr) : "No future events"}
        valueColor={diffHours < 6 ? "var(--accent-orange)" : diffHours < 24 ? "var(--accent-yellow)" : "var(--accent-cyan)"}
      />
      <Card 
        label="Min Miss Distance" 
        value={formatDistance(closest?.missDistanceKm || 0)} 
        subtitle={closest?.name || "None"}
        valueColor={closest && closest.missDistanceKm < 1 ? "var(--accent-red)" : "var(--accent-yellow)"}
      />
      <Card 
        label="Max Pc Score" 
        value={maxPc ? formatPc(maxPc.pc) : "0.0"} 
        subtitle={maxPc?.action === 'MANEUVER' ? "MANEUVER REQUIRED" : "ALL CLEAR"}
        valueColor={maxPc ? getPcColor(maxPc.pc) : "var(--accent-green)"}
      />
    </div>
  );
};
