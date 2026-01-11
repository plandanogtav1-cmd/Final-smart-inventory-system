import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { AlertTriangle, CheckCircle, XCircle, Trash2 } from 'lucide-react';

interface Alert {
  id: string;
  product_name: string;
  alert_type: string;
  severity: string;
  message: string;
  is_read: boolean;
  is_resolved: boolean;
  created_at: string;
}

export default function AlertsView() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('active');

  useEffect(() => {
    loadAlerts();
  }, [filter]);

  const loadAlerts = async () => {
    let query = supabase.from('alerts').select('*');

    if (filter === 'active') {
      query = query.eq('is_resolved', false);
    } else if (filter === 'resolved') {
      query = query.eq('is_resolved', true);
    }

    const { data: alertsData } = await query.order('created_at', { ascending: false });

    if (alertsData) {
      const productIds = alertsData.map(a => a.product_id);
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name')
        .in('id', productIds);

      if (productsData) {
        const productMap = productsData.reduce((acc, p) => {
          acc[p.id] = p.name;
          return acc;
        }, {} as Record<string, string>);

        const enriched = alertsData.map(a => ({
          ...a,
          product_name: productMap[a.product_id] || 'Unknown'
        }));

        setAlerts(enriched);
      }
    }
  };

  const resolveAlert = async (id: string) => {
    await supabase
      .from('alerts')
      .update({ is_resolved: true, is_read: true })
      .eq('id', id);
    loadAlerts();
  };

  const deleteAlert = async (id: string) => {
    if (confirm('Are you sure you want to permanently delete this alert?')) {
      await supabase
        .from('alerts')
        .delete()
        .eq('id', id);
      loadAlerts();
    }
  };

  const clearAllResolved = async () => {
    if (confirm('Are you sure you want to permanently delete ALL resolved alerts? This cannot be undone.')) {
      await supabase
        .from('alerts')
        .delete()
        .eq('is_resolved', true);
      loadAlerts();
    }
  };

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical':
        return { color: 'text-red-400 bg-red-500/10 border-red-500/50', icon: XCircle };
      case 'high':
        return { color: 'text-orange-400 bg-orange-500/10 border-orange-500/50', icon: AlertTriangle };
      case 'medium':
        return { color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/50', icon: AlertTriangle };
      default:
        return { color: 'text-blue-400 bg-blue-500/10 border-blue-500/50', icon: AlertTriangle };
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Stock Alerts</h1>
          <p className="text-gray-400">Monitor and manage inventory alerts</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 sm:flex-none px-3 lg:px-4 py-2 rounded-lg transition-all text-sm ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`flex-1 sm:flex-none px-3 lg:px-4 py-2 rounded-lg transition-all text-sm ${
              filter === 'active'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`flex-1 sm:flex-none px-3 lg:px-4 py-2 rounded-lg transition-all text-sm ${
              filter === 'resolved'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Resolved
          </button>
          {filter === 'resolved' && alerts.length > 0 && (
            <button
              onClick={clearAllResolved}
              className="px-3 lg:px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all text-sm flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Clear All</span>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {alerts.length > 0 ? (
          alerts.map((alert) => {
            const config = getSeverityConfig(alert.severity);
            const Icon = config.icon;

            return (
              <div
                key={alert.id}
                className={`bg-gray-900 border ${config.color} rounded-xl p-4 lg:p-6 hover:border-opacity-100 transition-all`}
              >
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className={`p-2 rounded-lg ${config.color} flex-shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-2 gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-lg truncate">{alert.product_name}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.color} capitalize`}>
                            {alert.severity}
                          </span>
                          <span className="px-2.5 py-1 bg-gray-800 text-gray-400 rounded-full text-xs font-medium capitalize">
                            {alert.alert_type.replace('_', ' ')}
                          </span>
                          <span className="text-gray-500 text-xs">
                            {new Date(alert.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      {!alert.is_resolved ? (
                        <button
                          onClick={() => resolveAlert(alert.id)}
                          className="px-3 lg:px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all text-sm flex items-center gap-2 flex-shrink-0"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span className="hidden sm:inline">Resolve</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => deleteAlert(alert.id)}
                          className="px-3 lg:px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all text-sm flex items-center gap-2 flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Clear</span>
                        </button>
                      )}
                    </div>
                    <p className="text-gray-300 mt-2 text-sm lg:text-base">{alert.message}</p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-400">No {filter !== 'all' ? filter : ''} alerts</p>
          </div>
        )}
      </div>
    </div>
  );
}
