import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, Calendar, ChevronDown, Eye } from 'lucide-react';

interface SalesData {
  date: string;
  amount: number;
  transactions: number;
}

interface DailySale {
  date: string;
  customer_name: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
}

export default function SalesChart() {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [dateRange, setDateRange] = useState('7');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [dailySales, setDailySales] = useState<DailySale[]>([]);

  useEffect(() => {
    loadSalesData();
  }, [dateRange, startDate, endDate]);

  const loadSalesData = async () => {
    let query = supabase
      .from('sales')
      .select('created_at, total_amount')
      .eq('status', 'completed')
      .order('created_at', { ascending: true });

    // Apply date filtering
    if (dateRange === 'custom' && startDate && endDate) {
      query = query.gte('created_at', startDate).lte('created_at', endDate + 'T23:59:59');
    } else {
      const days = parseInt(dateRange);
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - (days - 1));
      fromDate.setHours(0, 0, 0, 0);
      query = query.gte('created_at', fromDate.toISOString());
    }

    const { data } = await query;

    if (data) {
      // Group sales by date
      const salesByDate = data.reduce((acc, sale) => {
        const date = sale.created_at.split('T')[0];
        if (!acc[date]) {
          acc[date] = { amount: 0, transactions: 0 };
        }
        acc[date].amount += sale.total_amount;
        acc[date].transactions += 1;
        return acc;
      }, {} as Record<string, { amount: number; transactions: number }>);

      // Create date range array
      const days = dateRange === 'custom' && startDate && endDate 
        ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
        : parseInt(dateRange);
      
      const dateArray = Array.from({ length: days }, (_, i) => {
        const date = new Date();
        if (dateRange === 'custom' && startDate) {
          date.setTime(new Date(startDate).getTime());
          date.setDate(date.getDate() + i);
        } else {
          date.setDate(date.getDate() - (days - 1 - i));
        }
        return date.toISOString().split('T')[0];
      });

      const chartData = dateArray.map(date => ({
        date,
        amount: salesByDate[date]?.amount || 0,
        transactions: salesByDate[date]?.transactions || 0
      }));

      setSalesData(chartData);
    }
  };

  const loadDailySales = async (date: string) => {
    const { data } = await supabase
      .from('sales')
      .select(`
        created_at,
        total_amount,
        payment_method,
        customers(name)
      `)
      .eq('status', 'completed')
      .gte('created_at', date + 'T00:00:00')
      .lte('created_at', date + 'T23:59:59')
      .order('created_at', { ascending: false });

    if (data) {
      const formattedSales = data.map(sale => ({
        date: sale.created_at.split('T')[0],
        customer_name: sale.customers?.name || 'Walk-in Customer',
        total_amount: sale.total_amount,
        payment_method: sale.payment_method,
        created_at: sale.created_at
      }));
      setDailySales(formattedSales);
    }
  };

  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    setShowDetails(true);
    loadDailySales(date);
  };

  const maxAmount = Math.max(...salesData.map(d => d.amount), 1);
  const totalSales = salesData.reduce((sum, d) => sum + d.amount, 0);
  const totalTransactions = salesData.reduce((sum, d) => sum + d.transactions, 0);

  return (
    <>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-white text-lg font-semibold">Sales Trend</h3>
            <p className="text-gray-400 text-sm mt-1">
              {dateRange === 'custom' ? `${startDate} to ${endDate}` : `Last ${dateRange} days`}
            </p>
          </div>
          <div className="bg-green-600/10 p-2 rounded-lg">
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
        </div>

        {/* Date Range Controls */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            {['7', '14', '30', 'custom'].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  dateRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {range === 'custom' ? 'Custom' : `${range} days`}
              </button>
            ))}
          </div>

          {dateRange === 'custom' && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-gray-400 text-xs">Total Sales</p>
            <p className="text-white font-semibold text-lg">₱{totalSales.toLocaleString()}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-gray-400 text-xs">Transactions</p>
            <p className="text-white font-semibold text-lg">{totalTransactions}</p>
          </div>
        </div>

        {/* Sales Chart */}
        <div className={`space-y-3 ${
          dateRange !== '7' ? 'max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-slate-800 hover:scrollbar-thumb-slate-700' : ''
        }`}>
          {salesData.map((item, index) => {
            const percentage = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
            const date = new Date(item.date);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">{dayName}</span>
                    {item.amount > 0 && (
                      <button
                        onClick={() => handleDateClick(item.date)}
                        className="text-blue-400 hover:text-blue-300 p-1 hover:bg-blue-600/10 rounded transition-all"
                        title="View details"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-white font-medium">₱{item.amount.toLocaleString()}</span>
                    {item.transactions > 0 && (
                      <span className="text-gray-500 text-xs ml-2">({item.transactions} txn)</span>
                    )}
                  </div>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-600 to-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily Sales Details Modal */}
      {showDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white">
                Sales Details - {new Date(selectedDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h2>
              <button
                onClick={() => setShowDetails(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
              >
                ×
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-96 p-4">
              {dailySales.length > 0 ? (
                <div className="space-y-3">
                  {dailySales.map((sale, index) => (
                    <div key={index} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-white font-medium">{sale.customer_name}</h3>
                        <span className="text-green-400 font-semibold">₱{sale.total_amount.toLocaleString()}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
                        <div>
                          <span className="block">Payment: {sale.payment_method}</span>
                        </div>
                        <div>
                          <span className="block">Time: {new Date(sale.created_at).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 p-3 bg-gray-800 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Total for {new Date(selectedDate).toLocaleDateString()}:</span>
                      <span className="text-white font-semibold">
                        ₱{dailySales.reduce((sum, sale) => sum + sale.total_amount, 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-400">Transactions:</span>
                      <span className="text-white">{dailySales.length}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No sales recorded for this date</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
