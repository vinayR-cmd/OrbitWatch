import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { 
  MissionInput, 
  AnalysisResult, 
  LayerState, 
  SimulationState,
  ConjunctionEvent,
  SettingsState
} from '../types';
import { syncFormatterSettings } from '../utils/format';

export const DEFAULT_SETTINGS: SettingsState = {
  units: 'km',
  timeFormat: 'utc',
  showLabels: true,
  dotSize: 'medium',
  orbitOpacity: 80,
  globeTheme: 'space',
  simSpeed: 1,
  refreshInterval: 60,
  showEllipsoids: true,
};

interface MissionContextType {
  missionInput: MissionInput | null;
  setMissionInput: (input: MissionInput | null) => void;
  analysisResult: AnalysisResult | null;
  setAnalysisResult: React.Dispatch<React.SetStateAction<AnalysisResult | null>>;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  layers: LayerState;
  setLayers: React.Dispatch<React.SetStateAction<LayerState>>;
  simulation: SimulationState;
  setSimulation: React.Dispatch<React.SetStateAction<SimulationState>>;
  selectedConjunction: ConjunctionEvent | null;
  setSelectedConjunction: (event: ConjunctionEvent | null) => void;
  isDemoMode: boolean;
  setIsDemoMode: (isDemo: boolean) => void;
  backendConnected: boolean;
  setBackendConnected: (connected: boolean) => void;
  settings: SettingsState;
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  resetSettings: () => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
}

export const MissionContext = createContext<MissionContextType | undefined>(undefined);

export const MissionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [missionInput, setMissionInput] = useState<MissionInput | null>({mode: 'norad'});
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [layers, setLayers] = useState<LayerState>({
    debrisCloud: true,
    activeSatellites: true,
    safeRoutingCorridor: true,
    tcaMarkers: true,
    uncertaintyEllipsoids: true
  });
  
  const [simulation, setSimulation] = useState<SimulationState>({
    currentHour: 0,
    speed: 1,
    isPlaying: false
  });
  
  const [selectedConjunction, setSelectedConjunction] = useState<ConjunctionEvent | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [backendConnected, setBackendConnected] = useState<boolean>(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Initialize settings from localStorage or defaults
  const [settings, setSettings] = useState<SettingsState>(() => {
    try {
      const saved = localStorage.getItem('orbitwatch_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      console.warn('Failed to load settings', e);
    }
    return DEFAULT_SETTINGS;
  });

  // Keep layers in sync with settings.showEllipsoids initially
  useEffect(() => {
    setLayers(prev => ({ ...prev, uncertaintyEllipsoids: settings.showEllipsoids }));
  }, []);

  // Sync settings to global formatters
  useEffect(() => {
    syncFormatterSettings(settings);
  }, [settings]);

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: value };
      try {
        localStorage.setItem('orbitwatch_settings', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save settings', e);
      }
      return updated;
    });
    
    // Auto-sync specific settings to other state if necessary
    if (key === 'showEllipsoids') {
      setLayers(prev => ({ ...prev, uncertaintyEllipsoids: value as boolean }));
    } else if (key === 'simSpeed') {
      if (value !== 'live') {
        setSimulation(prev => ({ ...prev, speed: value as any }));
      }
    }
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.setItem('orbitwatch_settings', JSON.stringify(DEFAULT_SETTINGS));
    } catch (e) {}
    setLayers(prev => ({ ...prev, uncertaintyEllipsoids: DEFAULT_SETTINGS.showEllipsoids }));
    setSimulation(prev => ({ ...prev, speed: DEFAULT_SETTINGS.simSpeed as any }));
  };

  return (
    <MissionContext.Provider value={{
      missionInput, setMissionInput,
      analysisResult, setAnalysisResult,
      isLoading, setIsLoading,
      error, setError,
      layers, setLayers,
      simulation, setSimulation,
      selectedConjunction, setSelectedConjunction,
      isDemoMode, setIsDemoMode,
      backendConnected, setBackendConnected,
      settings, updateSetting, resetSettings,
      isSettingsOpen, setIsSettingsOpen
    }}>
      {children}
    </MissionContext.Provider>
  );
};
