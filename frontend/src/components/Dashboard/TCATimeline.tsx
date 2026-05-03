import React, { useContext } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { MissionContext } from '../../context/MissionContext';
import { formatPc } from '../../utils/format';

export const TCATimeline: React.FC = () => {
  const context = useContext(MissionContext);
  if (!context || !context.analysisResult) return null;

  const data = context.analysisResult.conjunctions.map(c => {
    const hoursAway = (new Date(c.tcaTime).getTime() - Date.now()) / 3600000;
    return {
      name: c.name,
      hours: hoursAway,
      pc: c.pc,
      fill: c.pc > 1e-4 ? '#f44336' : c.pc > 1e-5 ? '#ff6d00' : '#1e88e5'
    };
  }).filter(d => d.hours >= 0 && d.hours <= 72);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#141c35] p-3 border border-[#1a2040] rounded text-sm text-[#e8eaf6]">
          <p className="font-bold mb-1">{data.name}</p>
          <p>Pc: {formatPc(data.pc)}</p>
          <p>TCA: T+{data.hours.toFixed(1)}h</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <div className="text-[10px] text-[#4a5568] font-[500] uppercase tracking-[0.12em] mb-4">Conjunction Risk Timeline — T+0 to T+72h</div>
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <XAxis 
              dataKey="hours" 
              type="number" 
              domain={[0, 72]} 
              tickFormatter={(v) => `${v}h`} 
              stroke="#7986cb" 
              fontSize={11}
            />
            <YAxis 
              scale="log" 
              domain={['auto', 'auto']} 
              tickFormatter={(v) => v.toExponential(1)} 
              stroke="#7986cb" 
              fontSize={11}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff11' }} />
            <ReferenceLine y={1e-4} stroke="#f44336" strokeDasharray="3 3" label={{ position: 'top', value: 'NASA threshold', fill: '#f44336', fontSize: 10 }} />
            <Bar dataKey="pc" barSize={10} radius={[2,2,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
