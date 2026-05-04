import { useEffect, useContext, useState } from 'react';
import { MissionProvider, MissionContext } from './context/MissionContext';
import { AppLayout } from './components/Layout/AppLayout';
import { useWebSocket } from './hooks/useWebSocket';
import { API_ENDPOINTS } from './config/api';

const AppContent = () => {
  const context = useContext(MissionContext);
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'} | null>(null);

  // Initialize HTTP polling for live NORAD analysis (replaces WebSocket)
  useWebSocket(context?.missionInput?.mode === 'norad' ? context.missionInput.noradId : undefined);

  useEffect(() => {
    // Health check on backend
    const checkBackend = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.health);
        const data = await res.json();
        
        if (data.model_loaded) {
          context?.setBackendConnected(true);
          setToast({ msg: 'Backend connected successfully', type: 'success' });
          setTimeout(() => setToast(null), 3000);
        }
      } catch (e) {
        context?.setBackendConnected(false);
        context?.setIsDemoMode(true);
      }
    };
    
    checkBackend();
  }, []);

  return (
    <>
      <AppLayout />
      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded shadow-lg text-sm font-bold z-50 transition-opacity ${toast.type === 'success' ? 'bg-accent-green text-[#000]' : 'bg-accent-red text-[#fff]'}`}>
          {toast.msg}
        </div>
      )}
    </>
  );
};

function App() {
  return (
    <MissionProvider>
      <AppContent />
    </MissionProvider>
  );
}

export default App;
