import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, Calendar, Clock } from 'lucide-react';

interface SalesData {
  date: string;
  quantity: number;
  dayOfWeek: number;
  isHoliday: boolean;
}

interface Props {
  productId: string;
  productName: string;
}

export default function SalesPatternChart({ productId, productName }: Props) {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [weeklyPattern, setWeeklyPattern] = useState<number[]>([]);
  const [monthlyPattern, setMonthlyPattern] = useState<number[]>([]);
  const [weeklyTotals, setWeeklyTotals] = useState<number[]>([]);
  const [monthlyTotals, setMonthlyTotals] = useState<number[]>([]);

  useEffect(() => {
    loadSalesData();
  }, [productId]);

  const loadSalesData = async () => {
    const { data } = await supabase
      .from('sales')
      .select('quantity, created_at')
      .eq('product_id', productId)
      .eq('status', 'completed')
      .order('created_at', { ascending: true });

    if (data) {
      const processedData = data.map(sale => {
        const date = new Date(sale.created_at);
        return {
          date: sale.created_at.split('T')[0],
          quantity: sale.quantity,
          dayOfWeek: date.getDay(),
          isHoliday: isHoliday(date)
        };
      });

      setSalesData(processedData);
      calculatePatterns(processedData);
    }
  };

  const isHoliday = (date: Date): boolean => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const holidays = [
      { month: 1, day: 1 }, { month: 4, day: 9 }, { month: 5, day: 1 },
      { month: 6, day: 12 }, { month: 8, day: 21 }, { month: 8, day: 29 },
      { month: 11, day: 30 }, { month: 12, day: 25 }, { month: 12, day: 30 }
    ];
    return holidays.some(h => h.month === month && h.day === day);
  };

  const calculatePatterns = (data: SalesData[]) => {
    // Calculate actual sales by day of week
    const weeklyTotals = Array(7).fill(0);
    const weeklyCounts = Array(7).fill(0);
    
    data.forEach(sale => {
      weeklyTotals[sale.dayOfWeek] += sale.quantity;
      weeklyCounts[sale.dayOfWeek]++;
    });
    
    const weeklyAvg = weeklyTotals.map((total, index) => 
      weeklyCounts[index] > 0 ? total / weeklyCounts[index] : 0
    );
    setWeeklyPattern(weeklyAvg);
    
    // Store totals for display
    setWeeklyTotals(weeklyTotals);

    // Calculate actual sales by month
    const monthlyTotals = Array(12).fill(0);
    const monthlyCounts = Array(12).fill(0);
    
    data.forEach(sale => {
      const month = new Date(sale.date).getMonth();
      monthlyTotals[month] += sale.quantity;
      monthlyCounts[month]++;
    });
    
    const monthlyAvg = monthlyTotals.map((total, index) => 
      monthlyCounts[index] > 0 ? total / monthlyCounts[index] : 0
    );
    setMonthlyPattern(monthlyAvg);
    
    // Store totals for display
    setMonthlyTotals(monthlyTotals);
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const maxWeekly = Math.max(...weeklyPattern, 1);
  const maxMonthly = Math.max(...monthlyPattern, 1);
  const holidaySales = salesData.filter(s => s.isHoliday);
  const regularSales = salesData.filter(s => !s.isHoliday);
  
  const avgHolidaySales = holidaySales.length > 0 ? 
    holidaySales.reduce((sum, s) => sum + s.quantity, 0) / holidaySales.length : 0;
  const avgRegularSales = regularSales.length > 0 ? 
    regularSales.reduce((sum, s) => sum + s.quantity, 0) / regularSales.length : 0;

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-600/10 p-2 rounded-lg">
            <Calendar className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Weekly Sales Pattern</h3>
            <p className="text-gray-400 text-sm">Average sales by day of week for {productName}</p>
          </div>
        </div>

        <div className="space-y-4">
          {weeklyPattern.map((avg, index) => {
            const percentage = maxWeekly > 0 ? (avg / maxWeekly) * 100 : 0;
            const isWeekend = index === 0 || index === 6;
            
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className={`${isWeekend ? 'text-orange-400' : 'text-gray-400'} font-medium`}>
                    {dayNames[index]}
                  </span>
                  <div className="text-right">
                    <span className="text-white font-bold">{weeklyTotals[index] || 0}</span>
                    <span className="text-gray-400 text-xs ml-1">({avg.toFixed(1)} avg)</span>
                  </div>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isWeekend ? 'bg-gradient-to-r from-orange-600 to-orange-500' : 'bg-gradient-to-r from-blue-600 to-blue-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-green-600/10 p-2 rounded-lg">
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Monthly Sales Pattern</h3>
            <p className="text-gray-400 text-sm">Seasonal trends throughout the year</p>
          </div>
        </div>

        <div className="space-y-4">
          {monthlyPattern.map((avg, index) => {
            const percentage = maxMonthly > 0 ? (avg / maxMonthly) * 100 : 0;
            const isRainySeason = index >= 5 && index <= 10;
            const isSummer = index >= 2 && index <= 4;
            
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className={`font-medium ${
                    isRainySeason ? 'text-blue-400' : isSummer ? 'text-yellow-400' : 'text-gray-400'
                  }`}>
                    {monthNames[index]}
                  </span>
                  <div className="text-right">
                    <span className="text-white font-bold">{monthlyTotals[index] || 0}</span>
                    <span className="text-gray-400 text-xs ml-1">({avg.toFixed(1)} avg)</span>
                  </div>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isRainySeason ? 'bg-gradient-to-r from-blue-600 to-blue-500' :
                      isSummer ? 'bg-gradient-to-r from-yellow-600 to-yellow-500' :
                      'bg-gradient-to-r from-gray-600 to-gray-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-purple-600/10 p-2 rounded-lg">
            <Clock className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Holiday Impact Analysis</h3>
            <p className="text-gray-400 text-sm">Sales performance during holidays vs regular days</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">Regular Days</p>
            <p className="text-2xl font-bold text-white">{avgRegularSales.toFixed(1)}</p>
            <p className="text-gray-500 text-xs">units per day</p>
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">Holidays</p>
            <p className="text-2xl font-bold text-purple-400">{avgHolidaySales.toFixed(1)}</p>
            <p className="text-gray-500 text-xs">units per day</p>
          </div>
        </div>

        {avgHolidaySales > avgRegularSales && (
          <div className="mt-4 p-3 bg-purple-600/10 rounded-lg">
            <p className="text-purple-400 text-sm font-medium">
              Holiday Boost: +{Math.round(((avgHolidaySales / avgRegularSales) - 1) * 100)}% higher sales
            </p>
          </div>
        )}
      </div>
    </div>
  );
}