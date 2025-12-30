import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { AlertTriangle, AlertCircle } from 'lucide-react';

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  message: string;
  created_at: string;
}

export default function StockAlertsWidget() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    const { data } = await supabase
      .from('alerts')
      .select('*')
      .eq('is_resolved', false)
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) {
      setAlerts(data);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-500/10';
      case 'high': return 'text-orange-400 bg-orange-500/10';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10';
      default: return 'text-blue-400 bg-blue-500/10';
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-white text-lg font-semibold">Stock Alerts</h3>
          <p className="text-gray-400 text-sm mt-1">Recent notifications</p>
        </div>
        <div className="bg-orange-600/10 p-2 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-orange-400" />
        </div>
      </div>

      <div className="space-y-3">
        {alerts.length > 0 ? (
          alerts.map((alert) => (
            <div key={alert.id} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-all">
              <div className={`p-1.5 rounded ${getSeverityColor(alert.severity)}`}>
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-300 text-sm">{alert.message}</p>
                <p className="text-gray-500 text-xs mt-1">
                  {new Date(alert.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-center py-8">No active alerts</p>
        )}
      </div>
    </div>
  );
}
