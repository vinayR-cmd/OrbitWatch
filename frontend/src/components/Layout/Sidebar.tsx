import React, { useContext } from 'react';
import { MissionContext } from '../../context/MissionContext';
import { InputModeSelector } from '../Controls/InputModeSelector';
import { ModeAForm } from '../Controls/ModeAForm';
import { ModeBForm } from '../Controls/ModeBForm';
import { LayerToggles } from '../Controls/LayerToggles';
import { TimeScrubber } from '../Controls/TimeScrubber';

export const Sidebar: React.FC = () => {
  const context = useContext(MissionContext);
  if (!context) return null;
  const { missionInput } = context;

  const mode = missionInput?.mode || 'norad';

  return (
    <div className="h-full bg-space-secondary border-r border-space-border flex flex-col w-[280px] overflow-y-auto hidden md:flex">
      <div className="p-4 flex-1">
        {/* Mission Input Section */}
        <section className="mb-6">
          <InputModeSelector />
          <div className="mt-2 text-text-primary">
            {mode === 'prelaunch' ? <ModeAForm /> : <ModeBForm />}
          </div>
        </section>

        <div className="h-[1px] w-full bg-space-border my-6" />

        {/* Map Layers */}
        <section className="mb-6">
          <h3 className="text-[10px] text-[#4a5568] font-[500] uppercase tracking-[0.12em] mb-3">Map Layers</h3>
          <LayerToggles />
        </section>

        <div className="h-[1px] w-full bg-space-border my-6" />

        {/* Simulation */}
        <section>
          <h3 className="text-[10px] text-[#4a5568] font-[500] uppercase tracking-[0.12em] mb-3">Simulation</h3>
          <TimeScrubber />
        </section>
      </div>

      <div className="p-4 bg-space-primary border-t border-space-border">
        <p className="text-[10px] text-text-secondary">Model: OrbitalTransformer</p>
        <p className="text-[10px] text-text-secondary">Data: Space-Track.org</p>
      </div>
    </div>
  );
};
