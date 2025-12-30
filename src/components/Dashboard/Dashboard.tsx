import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Package,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Users,
  ShoppingCart,
  Activity
} from 'lucide-react';
import StatCard from './StatCard';
import TopProductsChart from './TopProductsChart';
import SalesChart from './SalesChart';
import StockAlertsWidget from './StockAlertsWidget';
import RecentSalesWidget from './RecentSalesWidget';

interface DashboardStats {
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  todaySales: number;
  totalCustomers: number;
  activeAlerts: number;
  salesGrowth: number;
  inventoryTurnover: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalValue: 0,
    lowStockCount: 0,
    todaySales: 0,
    totalCustomers: 0,
    activeAlerts: 0,
    salesGrowth: 0,
    inventoryTurnover: 0,
  });

  useEffect(() => {
    loadDashboardStats();

    const interval = setInterval(loadDashboardStats, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadDashboardStats = async () => {
    try {
      const [
        productsResult,
        salesResult,
        customersResult,
        alertsResult
      ] = await Promise.all([
        supabase.from('products').select('current_stock, unit_price, cost_price, min_stock_threshold').eq('is_active', true),
        supabase.from('sales').select('total_amount, created_at').eq('status', 'completed'),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('is_resolved', false)
      ]);

      const products = productsResult.data || [];
      const totalValue = products.reduce((sum, p) => sum + (p.current_stock * p.unit_price), 0);
      
      // Count low stock items manually
      const lowStockCount = products.filter(p => p.current_stock <= p.min_stock_threshold).length;

      const today = new Date().toISOString().split('T')[0];
      const todaySales = (salesResult.data || [])
        .filter(s => s.created_at.startsWith(today))
        .reduce((sum, s) => sum + s.total_amount, 0);

      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const lastMonthStr = lastMonth.toISOString().split('T')[0];

      const thisMonthSales = (salesResult.data || [])
        .filter(s => s.created_at >= lastMonthStr)
        .reduce((sum, s) => sum + s.total_amount, 0);

      const previousMonthStart = new Date(lastMonth);
      previousMonthStart.setMonth(previousMonthStart.getMonth() - 1);
      const previousMonthSales = (salesResult.data || [])
        .filter(s => s.created_at >= previousMonthStart.toISOString() && s.created_at < lastMonthStr)
        .reduce((sum, s) => sum + s.total_amount, 0);

      const salesGrowth = previousMonthSales > 0
        ? ((thisMonthSales - previousMonthSales) / previousMonthSales) * 100
        : 0;

      setStats({
        totalProducts: products.length,
        totalValue,
        lowStockCount,
        todaySales,
        totalCustomers: customersResult.count || 0,
        activeAlerts: alertsResult.count || 0,
        salesGrowth,
        inventoryTurnover: 0,
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400">Real-time insights into your inventory and sales</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Products"
          value={stats.totalProducts}
          icon={Package}
          trend={null}
          color="blue"
        />
        <StatCard
          title="Inventory Value"
          value={`₱${stats.totalValue.toLocaleString()}`}
          icon={DollarSign}
          trend={null}
          color="green"
        />
        <StatCard
          title="Low Stock Items"
          value={stats.lowStockCount}
          icon={AlertTriangle}
          trend={null}
          color="red"
        />
        <StatCard
          title="Today's Sales"
          value={`₱${stats.todaySales.toLocaleString()}`}
          icon={ShoppingCart}
          trend={stats.salesGrowth > 0 ? 'up' : stats.salesGrowth < 0 ? 'down' : null}
          color="purple"
        />
        <StatCard
          title="Total Customers"
          value={stats.totalCustomers}
          icon={Users}
          trend={null}
          color="indigo"
        />
        <StatCard
          title="Active Alerts"
          value={stats.activeAlerts}
          icon={Activity}
          trend={null}
          color="orange"
        />
        <StatCard
          title="Sales Growth"
          value={`${stats.salesGrowth.toFixed(1)}%`}
          icon={stats.salesGrowth >= 0 ? TrendingUp : TrendingDown}
          trend={stats.salesGrowth >= 0 ? 'up' : 'down'}
          color={stats.salesGrowth >= 0 ? 'green' : 'red'}
        />
        <StatCard
          title="Stock Turnover"
          value="N/A"
          icon={Activity}
          trend={null}
          color="teal"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesChart />
        <TopProductsChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StockAlertsWidget />
        <RecentSalesWidget />
      </div>
    </div>
  );
}
