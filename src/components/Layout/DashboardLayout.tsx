import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Dashboard from '../Dashboard/Dashboard';
import POSView from '../POSView';
import InventoryView from '../Inventory/InventoryView';
import ForecastingView from '../Forecasting/ForecastingView';
import ReportsView from '../Reports/ReportsView';
import ChatbotView from '../Chatbot/ChatbotView';
import CustomersView from '../Customers/CustomersView';
import SuppliersView from '../Suppliers/SuppliersView';
import AlertsView from '../Alerts/AlertsView';
import SettingsView from '../Settings/SettingsView';

export default function DashboardLayout() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'pos':
        return <POSView />;
      case 'inventory':
        return <InventoryView />;
      case 'forecasting':
        return <ForecastingView />;
      case 'reports':
        return <ReportsView />;
      case 'chatbot':
        return <ChatbotView />;
      case 'customers':
        return <CustomersView />;
      case 'suppliers':
        return <SuppliersView />;
      case 'alerts':
        return <AlertsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed lg:relative lg:translate-x-0 z-50 transition-transform duration-300 ease-in-out lg:z-auto`}>
        <Sidebar activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); setSidebarOpen(false); }} />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
