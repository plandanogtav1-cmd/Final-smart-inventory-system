import { useOffline } from '../../contexts/OfflineContext';
import { Wifi, WifiOff, Clock, CheckCircle, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export default function OfflineIndicator() {
  const { isOnline, pendingActions, syncPendingActions } = useOffline();
  const [syncing, setSyncing] = useState(false);

  const handleManualSync = async () => {
    if (!isOnline || pendingActions.length === 0 || syncing) return;
    
    setSyncing(true);
    try {
      await syncPendingActions();
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
    setSyncing(false);
  };

  // Always show the indicator for visibility
  return (
    <div className="fixed top-20 right-4 z-40">
      <button
        onClick={pendingActions.length > 0 && isOnline ? handleManualSync : undefined}
        disabled={syncing || pendingActions.length === 0 || !isOnline}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg shadow-lg border text-xs transition-all ${
          isOnline 
            ? 'bg-green-900 border-green-700 text-green-100' 
            : 'bg-orange-900 border-orange-700 text-orange-100'
        } ${
          pendingActions.length > 0 && isOnline 
            ? 'hover:bg-opacity-80 cursor-pointer' 
            : 'cursor-default'
        }`}
        title={pendingActions.length > 0 && isOnline ? 'Click to sync pending actions' : undefined}
      >
        {isOnline ? (
          <Wifi className="w-3 h-3" />
        ) : (
          <WifiOff className="w-3 h-3" />
        )}
        
        <span className="font-medium">
          {isOnline ? 'Online' : 'Offline'}
        </span>
        
        {pendingActions.length > 0 && (
          <>
            <div className="w-px h-3 bg-current opacity-30" />
            <div className="flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              <span>{pendingActions.length}</span>
              {syncing && <RefreshCw className="w-2.5 h-2.5 animate-spin ml-1" />}
            </div>
          </>
        )}
      </button>
    </div>
  );
}