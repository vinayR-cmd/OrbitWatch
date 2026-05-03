import React from 'react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { CesiumGlobe } from '../Globe/CesiumGlobe';
import { OrbitalLayer } from '../Globe/OrbitalLayer';
import { AlertBanner } from '../Alerts/AlertBanner';
import { MetricCards } from '../Dashboard/MetricCards';
import { ConjunctionTable } from '../Dashboard/ConjunctionTable';
import { TCATimeline } from '../Dashboard/TCATimeline';
import { SafeRouting } from '../Dashboard/SafeRouting';
import { DebrisDensityMap } from '../Dashboard/DebrisDensityMap';
import { UncertaintyPanel } from '../Dashboard/UncertaintyPanel';
import { DecayPredictor } from '../Dashboard/DecayPredictor';
import { SettingsPanel } from '../Settings/SettingsPanel';
import { MissionContext } from '../../context/MissionContext';

export const AppLayout: React.FC = () => {
  const context = React.useContext(MissionContext);
  if (!context) return null;
  const { isLoading, analysisResult } = context;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '280px 1fr 420px',
      gridTemplateRows: '56px 1fr',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      backgroundColor: '#0a0e1a',
    }}>
      <TopBar />

      <Sidebar />

      {/* Center Globe Area */}
      <div style={{
        position: 'relative',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
      }}>
        <CesiumGlobe />
        <OrbitalLayer />

        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#000000aa] pointer-events-none">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-accent-cyan border-t-transparent rounded-full animate-spin mb-4" />
              <span className="text-text-primary font-bold tracking-widest text-sm uppercase shadow-sm">Fetching orbital data...</span>
            </div>
          </div>
        )}
      </div>

      {/* Right Dashboard Area */}
      <div className="h-full bg-space-secondary overflow-y-auto flex flex-col hide-scrollbar" id="right-panel">
        <AlertBanner />

        {isLoading && !analysisResult ? (
          <div className="p-4 flex flex-col gap-4 animate-[pulse_1.5s_infinite]">
            <div className="grid grid-cols-2 gap-4">
              <div className="h-24 bg-space-card rounded border border-space-border/50" />
              <div className="h-24 bg-space-card rounded border border-space-border/50" />
              <div className="h-24 bg-space-card rounded border border-space-border/50" />
              <div className="h-24 bg-space-card rounded border border-space-border/50" />
            </div>
            <div className="h-64 bg-space-card rounded border border-space-border/50" />
            <div className="h-48 bg-space-card rounded border border-space-border/50" />
          </div>
        ) : (
          <div className="p-4 flex flex-col gap-6">
            <MetricCards />

            <div className="w-full h-[1px] bg-space-border" />
            <ConjunctionTable />

            <div className="w-full h-[1px] bg-space-border" />
            <TCATimeline />

            <div className="w-full h-[1px] bg-space-border" id="routing-panel" />
            <SafeRouting />

            <div className="w-full h-[1px] bg-space-border" />
            <DebrisDensityMap />

            <div className="w-full h-[1px] bg-space-border" />
            <UncertaintyPanel />

            <div className="w-full h-[1px] bg-space-border" />
            <DecayPredictor />
          </div>
        )}
      </div>

      {/* Settings Panel Overlay */}
      <SettingsPanel />
    </div>
  );
};
