import React, { useContext, useEffect } from 'react';
import { MissionContext } from '../../context/MissionContext';

export const SettingsPanel: React.FC = () => {
  const context = useContext(MissionContext);
  if (!context) return null;
  const { settings, updateSetting, resetSettings, isSettingsOpen, setIsSettingsOpen } = context;

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSettingsOpen(false);
    };
    if (isSettingsOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, setIsSettingsOpen]);

  if (!isSettingsOpen) return null;

  return (
    <>
      {/* Semi-transparent dark overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
        onClick={() => setIsSettingsOpen(false)}
      />

      {/* Slide-in panel */}
      <div 
        className={`fixed top-0 right-0 h-full w-full sm:w-[320px] bg-space-primary border-l border-space-border z-50 transform transition-transform duration-300 ease-in-out flex flex-col`}
        style={{ transform: isSettingsOpen ? 'translateX(0)' : 'translateX(100%)' }}
      >
        <div className="p-6 flex-1 overflow-y-auto hide-scrollbar">
          <h2 className="text-xl font-bold text-text-primary mb-6">Settings</h2>
          
          {/* SECTION 1: Display */}
          <div className="mb-8">
            <h3 className="text-[12px] uppercase text-text-secondary tracking-widest font-semibold mb-4">Display</h3>
            
            {/* Distance units */}
            <div className="flex justify-between items-center mb-5">
              <span className="text-sm text-text-primary">Distance units</span>
              <div className="flex bg-space-secondary rounded-full p-1 border border-space-border/50">
                <button 
                  onClick={() => updateSetting('units', 'km')}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${settings.units === 'km' ? 'bg-accent-cyan/20 text-accent-cyan font-bold' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  KM
                </button>
                <button 
                  onClick={() => updateSetting('units', 'miles')}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${settings.units === 'miles' ? 'bg-accent-cyan/20 text-accent-cyan font-bold' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  Miles
                </button>
              </div>
            </div>

            {/* Time format */}
            <div className="flex justify-between items-center mb-5">
              <span className="text-sm text-text-primary">Time format</span>
              <div className="flex bg-space-secondary rounded-full p-1 border border-space-border/50">
                <button 
                  onClick={() => updateSetting('timeFormat', 'utc')}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${settings.timeFormat === 'utc' ? 'bg-accent-cyan/20 text-accent-cyan font-bold' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  UTC
                </button>
                <button 
                  onClick={() => updateSetting('timeFormat', 'local')}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${settings.timeFormat === 'local' ? 'bg-accent-cyan/20 text-accent-cyan font-bold' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  Local
                </button>
              </div>
            </div>

            {/* Show object labels */}
            <div className="flex justify-between items-center mb-5">
              <span className="text-sm text-text-primary">Show object labels</span>
              <button 
                onClick={() => updateSetting('showLabels', !settings.showLabels)}
                className={`w-10 h-5 rounded-full relative transition-colors ${settings.showLabels ? 'bg-accent-cyan' : 'bg-space-border'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${settings.showLabels ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* Debris dot size */}
            <div className="flex justify-between items-center mb-5">
              <span className="text-sm text-text-primary">Debris dot size</span>
              <div className="flex bg-space-secondary rounded border border-space-border/50 overflow-hidden">
                {(['small', 'medium', 'large'] as const).map(size => (
                  <button 
                    key={size}
                    onClick={() => updateSetting('dotSize', size)}
                    className={`px-2 py-1 text-xs capitalize transition-colors ${settings.dotSize === size ? 'bg-accent-cyan/20 text-accent-cyan font-bold' : 'text-text-secondary hover:text-text-primary hover:bg-space-card/50'}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Orbit path opacity */}
            <div className="flex flex-col mb-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-text-primary">Orbit path opacity</span>
                <span className="text-xs text-text-secondary">{settings.orbitOpacity}%</span>
              </div>
              <input 
                type="range" 
                min="20" max="100" step="5" 
                value={settings.orbitOpacity}
                onChange={(e) => updateSetting('orbitOpacity', Number(e.target.value))}
                className="w-full accent-accent-cyan cursor-pointer"
              />
            </div>

            {/* Globe theme */}
            <div className="flex flex-col mb-5">
              <span className="text-sm text-text-primary mb-2">Globe theme</span>
              <div className="flex bg-space-secondary rounded border border-space-border/50 overflow-hidden w-full">
                {(['space', 'terrain', 'minimal'] as const).map(theme => (
                  <button 
                    key={theme}
                    onClick={() => updateSetting('globeTheme', theme)}
                    className={`flex-1 py-1.5 text-xs capitalize transition-colors ${settings.globeTheme === theme ? 'bg-accent-cyan/20 text-accent-cyan font-bold' : 'text-text-secondary hover:text-text-primary hover:bg-space-card/50'}`}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="w-full h-[1px] bg-space-border mb-6" />

          {/* SECTION 2: Simulation */}
          <div>
            <h3 className="text-[12px] uppercase text-text-secondary tracking-widest font-semibold mb-4">Simulation</h3>
            
            {/* Default simulation speed */}
            <div className="flex flex-col mb-5">
              <span className="text-sm text-text-primary mb-2">Default sim speed</span>
              <div className="flex bg-space-secondary rounded border border-space-border/50 overflow-hidden w-full">
                {(['0.5', '1', '10', 'live'] as const).map(speed => (
                  <button 
                    key={speed}
                    onClick={() => updateSetting('simSpeed', speed === 'live' ? 'live' : Number(speed) as any)}
                    className={`flex-1 py-1.5 text-xs transition-colors ${settings.simSpeed.toString() === speed ? 'bg-accent-cyan/20 text-accent-cyan font-bold' : 'text-text-secondary hover:text-text-primary hover:bg-space-card/50'}`}
                  >
                    {speed === 'live' ? 'Live' : `${speed}x`}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto-refresh interval */}
            <div className="flex flex-col mb-5">
              <span className="text-sm text-text-primary mb-2">Auto-refresh interval</span>
              <div className="flex bg-space-secondary rounded border border-space-border/50 overflow-hidden w-full">
                {([30, 60, 120, 'manual'] as const).map(interval => (
                  <button 
                    key={interval}
                    onClick={() => updateSetting('refreshInterval', interval)}
                    className={`flex-1 py-1.5 text-[10px] sm:text-xs transition-colors ${settings.refreshInterval === interval ? 'bg-accent-cyan/20 text-accent-cyan font-bold' : 'text-text-secondary hover:text-text-primary hover:bg-space-card/50'}`}
                  >
                    {interval === 'manual' ? 'Manual' : `${interval}s`}
                  </button>
                ))}
              </div>
            </div>

            {/* Show uncertainty ellipsoids */}
            <div className="flex justify-between items-center mb-5">
              <span className="text-sm text-text-primary">Show uncertainty ellipsoids</span>
              <button 
                onClick={() => updateSetting('showEllipsoids', !settings.showEllipsoids)}
                className={`w-10 h-5 rounded-full relative transition-colors ${settings.showEllipsoids ? 'bg-accent-cyan' : 'bg-space-border'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${settings.showEllipsoids ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* BOTTOM OF PANEL: Buttons */}
        <div className="p-4 border-t border-space-border bg-space-primary flex gap-3">
          <button 
            onClick={resetSettings}
            className="flex-1 py-2 rounded border border-space-border/80 text-text-secondary hover:text-text-primary hover:bg-space-card transition-colors text-sm"
          >
            Reset defaults
          </button>
          <button 
            onClick={() => setIsSettingsOpen(false)}
            className="flex-1 py-2 rounded bg-accent-cyan/20 text-accent-cyan hover:bg-accent-cyan/30 transition-colors text-sm font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
};
