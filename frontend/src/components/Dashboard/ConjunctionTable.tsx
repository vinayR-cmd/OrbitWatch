import React, { useContext, useState } from 'react';
import { ChevronUp, ChevronDown, CheckCircle } from 'lucide-react';
import { MissionContext } from '../../context/MissionContext';
import { formatTime, formatDistance, formatPc, getPcColor, formatCountdown } from '../../utils/format';
import { ConjunctionEvent } from '../../types';

export const ConjunctionTable: React.FC = () => {
  const context = useContext(MissionContext);
  if (!context) return null;
  const { analysisResult, selectedConjunction, setSelectedConjunction } = context;

  const [sortField, setSortField] = useState<keyof ConjunctionEvent>('pc');
  const [sortAsc, setSortAsc] = useState(false);

  if (!analysisResult) return null;
  const conjs = [...analysisResult.conjunctions];

  if (conjs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
        <CheckCircle className="text-accent-green mb-2" size={32} />
        <span>No conjunction events detected</span>
      </div>
    );
  }

  conjs.sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    
    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const handleSort = (field: keyof ConjunctionEvent) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const Th = ({ label, field }: { label: string, field: keyof ConjunctionEvent }) => (
    <th 
      className="text-left text-[11px] uppercase tracking-wider text-text-secondary pb-3 cursor-pointer hover:text-text-primary"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortField === field && (sortAsc ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}
      </div>
    </th>
  );

  return (
    <div className="w-full">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <Th label="Object" field="name" />
            <Th label="TCA" field="tcaTime" />
            <Th label="Miss Dist" field="missDistanceKm" />
            <Th label="Pc Score" field="pc" />
            <Th label="Action" field="action" />
          </tr>
        </thead>
        <tbody>
          {conjs.map((c, i) => {
            const isSelected = selectedConjunction?.noradId === c.noradId;
            return (
              <tr 
                key={c.noradId} 
                onClick={() => setSelectedConjunction(c)}
                className={`border-b border-[#1a2845] cursor-pointer hover:bg-[rgba(0,229,255,0.04)] h-[36px] ${i % 2 === 0 ? 'bg-[rgba(255,255,255,0.02)]' : 'bg-[#0c1120]'}`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <td className={`pl-2 ${isSelected ? 'border-l-[3px] border-[#00e5ff]' : 'border-l-[3px] border-transparent'}`}>
                  <div className="font-bold text-sm text-text-primary">{c.name}</div>
                  <div className="text-[10px] text-text-secondary">{c.noradId}</div>
                </td>
                <td>
                  <div className="text-sm">{formatTime(c.tcaTime)}</div>
                  <div className="text-[10px] text-text-secondary">in {Math.floor((new Date(c.tcaTime).getTime() - Date.now())/3600000)}h</div>
                </td>
                <td className="text-sm" style={{ color: getPcColor(c.pc) }}>
                  {formatDistance(c.missDistanceKm)}
                </td>
                <td className="text-sm font-[700] tabular-nums" style={{ color: getPcColor(c.pc) }}>
                  {formatPc(c.pc)}
                </td>
                <td>
                  <span className={`text-[9px] px-[8px] py-[2px] rounded-[4px] ${c.action === 'MANEUVER' ? 'bg-[rgba(244,67,54,0.15)] border border-[rgba(244,67,54,0.4)] text-[#f44336]' : 'bg-[rgba(41,98,255,0.12)] border border-[rgba(41,98,255,0.3)] text-[#5c8fff]'}`}>
                    {c.action}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
