import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface OfflineContextType {
  isOnline: boolean;
  pendingActions: any[];
  addPendingAction: (action: any) => void;
  syncPendingActions: () => Promise<void>;
  getLocalData: (key: string) => any;
  setLocalData: (key: string, data: any) => void;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return context;
};

interface Props {
  children: ReactNode;
}

export const OfflineProvider = ({ children }: Props) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useState<any[]>([]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingActions();
    };
    
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load pending actions from localStorage
    const saved = localStorage.getItem('pendingActions');
    if (saved) {
      setPendingActions(JSON.parse(saved));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addPendingAction = (action: any) => {
    const newActions = [...pendingActions, { ...action, timestamp: Date.now() }];
    setPendingActions(newActions);
    localStorage.setItem('pendingActions', JSON.stringify(newActions));
  };

  const syncPendingActions = async () => {
    if (!isOnline || pendingActions.length === 0) return;

    try {
      for (const action of pendingActions) {
        switch (action.type) {
          case 'sale':
            await supabase.from('sales').insert([action.data]);
            // Update product stock
            await supabase
              .from('products')
              .update({ current_stock: action.data.new_stock })
              .eq('id', action.data.product_id);
            break;
          case 'product_update':
            await supabase
              .from('products')
              .update(action.data)
              .eq('id', action.id);
            break;
          case 'customer_add':
            await supabase.from('customers').insert([action.data]);
            break;
        }
      }
      
      // Clear pending actions after successful sync
      setPendingActions([]);
      localStorage.removeItem('pendingActions');
      
      // Refresh cached data
      await refreshLocalCache();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const refreshLocalCache = async () => {
    try {
      const [products, customers, sales] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('customers').select('*'),
        supabase.from('sales').select('*').limit(100).order('created_at', { ascending: false })
      ]);

      if (products.data) setLocalData('products', products.data);
      if (customers.data) setLocalData('customers', customers.data);
      if (sales.data) setLocalData('sales', sales.data);
    } catch (error) {
      console.error('Cache refresh failed:', error);
      // Don't throw error, just log it
    }
  };

  const getLocalData = (key: string) => {
    const data = localStorage.getItem(`cache_${key}`);
    return data ? JSON.parse(data) : null;
  };

  const setLocalData = (key: string, data: any) => {
    localStorage.setItem(`cache_${key}`, JSON.stringify(data));
  };

  // Initial cache load when online
  useEffect(() => {
    if (isOnline) {
      refreshLocalCache().catch(error => {
        console.error('Initial cache load failed:', error);
      });
    }
  }, [isOnline]);

  return (
    <OfflineContext.Provider value={{
      isOnline,
      pendingActions,
      addPendingAction,
      syncPendingActions,
      getLocalData,
      setLocalData
    }}>
      {children}
    </OfflineContext.Provider>
  );
};