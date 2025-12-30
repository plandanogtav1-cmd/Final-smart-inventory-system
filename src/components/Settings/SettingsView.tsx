import { Settings, User, Database, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function SettingsView() {
  const { user } = useAuth();

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400">Manage your account and application settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-600/10 p-2 rounded-lg">
              <User className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-white text-lg font-semibold">Account Information</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">User ID</label>
              <input
                type="text"
                value={user?.id || ''}
                disabled
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 cursor-not-allowed font-mono text-sm"
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-green-600/10 p-2 rounded-lg">
              <Bell className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-white text-lg font-semibold">Notification Settings</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Low Stock Alerts</p>
                <p className="text-gray-400 text-sm">Get notified when stock is low</p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5 rounded border-gray-700 bg-gray-800 text-blue-600"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Sales Notifications</p>
                <p className="text-gray-400 text-sm">Get notified on new sales</p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5 rounded border-gray-700 bg-gray-800 text-blue-600"
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-purple-600/10 p-2 rounded-lg">
              <Database className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-white text-lg font-semibold">Database Connection</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <span className="text-gray-300">Status</span>
              <span className="flex items-center gap-2 text-green-400">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <span className="text-gray-300">Provider</span>
              <span className="text-white font-medium">Supabase</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-orange-600/10 p-2 rounded-lg">
              <Settings className="w-5 h-5 text-orange-400" />
            </div>
            <h3 className="text-white text-lg font-semibold">System Information</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <span className="text-gray-300">Version</span>
              <span className="text-white font-medium">1.0.0</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <span className="text-gray-300">Environment</span>
              <span className="text-white font-medium">Production</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
