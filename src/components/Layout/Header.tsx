import { Bell, Search, User, X, Wifi, WifiOff, Menu, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useOffline } from '../../contexts/OfflineContext';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface SearchResult {
  id: string;
  name: string;
  type: 'product' | 'customer';
  details?: string;
}

interface Alert {
  id: string;
  message: string;
  severity: string;
  created_at: string;
  product_id?: string;
}

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuth();
  const { isOnline, pendingActions, syncPendingActions } = useOffline();
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
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

  useEffect(() => {
    loadUnreadAlerts();
    loadAlerts();

    const subscription = supabase
      .channel('alerts_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        () => {
          loadUnreadAlerts();
          loadAlerts();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (searchTerm.length > 2) {
      performSearch();
      setShowSearchResults(true);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchTerm]);

  const loadUnreadAlerts = async () => {
    const { count } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false);

    setUnreadAlerts(count || 0);
  };

  const loadAlerts = async () => {
    const { data } = await supabase
      .from('alerts')
      .select('*')
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) {
      setAlerts(data);
    }
  };

  const performSearch = async () => {
    const results: SearchResult[] = [];

    // Search products
    const { data: products } = await supabase
      .from('products')
      .select('id, name, sku, category')
      .or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`)
      .limit(5);

    if (products) {
      results.push(...products.map(p => ({
        id: p.id,
        name: p.name,
        type: 'product' as const,
        details: `${p.sku} • ${p.category}`
      })));
    }

    // Search customers
    const { data: customers } = await supabase
      .from('customers')
      .select('id, name, email')
      .ilike('name', `%${searchTerm}%`)
      .limit(3);

    if (customers) {
      results.push(...customers.map(c => ({
        id: c.id,
        name: c.name,
        type: 'customer' as const,
        details: c.email
      })));
    }

    setSearchResults(results);
  };

  const handleSearchResultClick = (result: SearchResult) => {
    // Simple alert for now instead of navigation
    alert(`Selected ${result.type}: ${result.name}`);
    setSearchTerm('');
    setShowSearchResults(false);
  };

  const markAlertAsRead = async (alertId: string) => {
    await supabase
      .from('alerts')
      .update({ is_read: true })
      .eq('id', alertId);
    
    loadUnreadAlerts();
    loadAlerts();
  };

  const markAllAlertsAsRead = async () => {
    await supabase
      .from('alerts')
      .update({ is_read: true })
      .eq('is_read', false);
    
    loadUnreadAlerts();
    loadAlerts();
    setShowNotifications(false);
  };

  return (
    <header className="bg-gray-900 border-b border-gray-800 px-4 lg:px-8 py-4 relative">
      <div className="flex items-center justify-between">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all mr-4"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        {/* Search - Hidden on mobile */}
        <div className="hidden lg:flex flex-1 max-w-2xl relative">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search products, customers, reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>

          {/* Search Results Dropdown - Hidden on mobile */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
              {searchResults.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSearchResultClick(result)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{result.name}</p>
                      {result.details && (
                        <p className="text-gray-400 text-sm">{result.details}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 capitalize bg-gray-700 px-2 py-1 rounded">
                      {result.type}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 lg:gap-4 lg:ml-6">
          {/* Offline Indicator */}
          <button
            onClick={pendingActions.length > 0 && isOnline ? handleManualSync : undefined}
            disabled={syncing || pendingActions.length === 0 || !isOnline}
            className={`flex items-center gap-1 lg:gap-2 px-2 lg:px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isOnline 
                ? 'bg-gray-800 text-gray-400' 
                : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
            } ${
              pendingActions.length > 0 && isOnline 
                ? 'hover:bg-opacity-80 cursor-pointer' 
                : 'cursor-default'
            }`}
            title={pendingActions.length > 0 && isOnline ? 'Click to sync pending actions' : undefined}
          >
            {isOnline ? (
              <Wifi className="w-3.5 h-3.5" />
            ) : (
              <WifiOff className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
            {pendingActions.length > 0 && (
              <>
                <span className="bg-orange-500 text-white px-1.5 py-0.5 rounded-full text-xs">
                  {pendingActions.length}
                </span>
                {syncing && <RefreshCw className="w-2.5 h-2.5 animate-spin ml-1" />}
              </>
            )}
          </button>

          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
            >
              <Bell className="w-5 h-5" />
              {unreadAlerts > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadAlerts > 9 ? '9+' : unreadAlerts}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                  <h3 className="text-white font-semibold">Notifications</h3>
                  <div className="flex items-center gap-2">
                    {unreadAlerts > 0 && (
                      <button
                        onClick={markAllAlertsAsRead}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        Mark all read
                      </button>
                    )}
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="max-h-80 overflow-y-auto">
                  {alerts.length > 0 ? (
                    alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="p-4 border-b border-gray-700 last:border-b-0 hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-white text-sm">{alert.message}</p>
                            <p className="text-gray-400 text-xs mt-1">
                              {new Date(alert.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              alert.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                              alert.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                              alert.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {alert.severity}
                            </span>
                            <button
                              onClick={() => markAlertAsRead(alert.id)}
                              className="text-gray-400 hover:text-white text-xs"
                            >
                              ✓
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-400">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No new notifications</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Info - Simplified on mobile */}
          <div className="flex items-center gap-2 lg:gap-3 pl-2 lg:pl-4 border-l border-gray-800">
            <div className="w-8 lg:w-9 h-8 lg:h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <User className="w-4 lg:w-5 h-4 lg:h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-white">
                {user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
