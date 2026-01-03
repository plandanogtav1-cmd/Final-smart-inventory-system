import {
  LayoutDashboard,
  Package,
  TrendingUp,
  FileText,
  MessageSquare,
  Users,
  Truck,
  Bell,
  Settings,
  LogOut,
  CreditCard,
  Brain
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { signOut } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', label: 'POS System', icon: CreditCard },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'forecasting', label: 'AI Forecasting', icon: TrendingUp },
    { id: 'chatbot', label: 'AI Assistant', icon: MessageSquare },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'suppliers', label: 'Suppliers', icon: Truck },
    { id: 'alerts', label: 'Alerts', icon: Bell },
  ];

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-screen">
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 p-2.5 rounded-xl shadow-lg">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">Inventra</h1>
            <p className="text-gray-400 text-xs">AI Powered Inventory</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="p-4 border-t border-gray-800 space-y-1">
        <button
          onClick={() => onTabChange('settings')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
            activeTab === 'settings'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Settings</span>
        </button>

        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
