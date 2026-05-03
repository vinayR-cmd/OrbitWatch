import React, { useContext } from 'react';
import { Globe, Navigation, AlertTriangle, Circle, Satellite } from 'lucide-react';
import { MissionContext } from '../../context/MissionContext';
import { LayerState } from '../../types';

export const LayerToggles: React.FC = () => {
  const context = useContext(MissionContext);
  if (!context) return null;
  const { layers, setLayers } = context;

  const toggleLayer = (key: keyof LayerState) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const ToggleRow = ({ icon: Icon, label, layerKey }: { icon: any, label: string, layerKey: keyof LayerState }) => (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-text-secondary" />
        <span className="text-sm">{label}</span>
      </div>
      <button 
        onClick={() => toggleLayer(layerKey)}
        className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${layers[layerKey] ? 'bg-accent-cyan' : 'bg-space-card border border-space-border'}`}
      >
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-[#fff] rounded-full transition-transform duration-200 ${layers[layerKey] ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-1">
      <ToggleRow icon={Globe} label="Debris Cloud" layerKey="debrisCloud" />
      <ToggleRow icon={Satellite} label="Active Satellites" layerKey="activeSatellites" />
      <ToggleRow icon={Navigation} label="Safe Corridor" layerKey="safeRoutingCorridor" />
      <ToggleRow icon={AlertTriangle} label="TCA Markers" layerKey="tcaMarkers" />
      <ToggleRow icon={Circle} label="Uncertainty Ellipsoids" layerKey="uncertaintyEllipsoids" />
    </div>
  );
};
