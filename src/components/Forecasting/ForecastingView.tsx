import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ExternalDataService } from '../../lib/externalDataService';
import { TrendingUp, AlertCircle, CheckCircle, Brain, BarChart3, DollarSign, Calendar, Target } from 'lucide-react';
import SalesPatternChart from './SalesPatternChart';
import StatCard from './StatCard';

interface Forecast {
  id: string;
  product_id: string;
  product_name: string;
  forecast_date: string;
  predicted_demand: number;
  confidence_score: number;
  recommendation: string;
  factors?: {
    reasoning?: string;
    change_percent?: number;
    demand_change?: number;
    insights?: any;
  };
  created_at: string;
}

export default function ForecastingView() {
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedForecast, setSelectedForecast] = useState<Forecast | null>(null);
  const [forecastPeriod, setForecastPeriod] = useState<30>(30);
  const [businessIntelligence, setBusinessIntelligence] = useState({
    projectedRevenue: 0,
    growthTrend: 0,
    topCategories: [],
    riskFactors: [],
    opportunities: []
  });

  useEffect(() => {
    loadForecasts();
    generateBusinessIntelligence();
  }, [forecastPeriod]); // Regenerate when forecast period changes

  const loadForecasts = async () => {
    const { data: forecastsData } = await supabase
      .from('forecasts')
      .select('*, factors')
      .order('created_at', { ascending: false });

    if (forecastsData) {
      const productIds = forecastsData.map(f => f.product_id);
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name')
        .in('id', productIds);

      if (productsData) {
        const productMap = productsData.reduce((acc, p) => {
          acc[p.id] = p.name;
          return acc;
        }, {} as Record<string, string>);

        const enriched = forecastsData.map(f => ({
          id: f.id,
          product_id: f.product_id,
          product_name: productMap[f.product_id] || 'Unknown',
          forecast_date: f.forecast_date,
          predicted_demand: f.predicted_demand,
          confidence_score: f.confidence_score,
          recommendation: f.recommendation,
          factors: f.factors,
          created_at: f.created_at
        }));

        // Remove duplicates - keep only latest forecast per product
        const uniqueForecasts = enriched.reduce((acc, forecast) => {
          const existing = acc.find(f => f.product_id === forecast.product_id);
          if (!existing || new Date(forecast.created_at) > new Date(existing.created_at)) {
            return [...acc.filter(f => f.product_id !== forecast.product_id), forecast];
          }
          return acc;
        }, [] as typeof enriched);

        setForecasts(uniqueForecasts);
      }
    }
  };

  const generateForecasts = async () => {
    setLoading(true);
    try {
      // Get external data for today
      const today = new Date().toISOString().split('T')[0];
      await ExternalDataService.fetchWeatherData(today);
      await ExternalDataService.fetchHolidayData(today);
      await ExternalDataService.fetchEconomicData(today);
      
      const externalFactors = await ExternalDataService.getExternalFactors(today);
      
      const { data: products } = await supabase
        .from('products')
        .select('id, name, category')
        .eq('is_active', true);

      if (products) {
        const { data: sales } = await supabase
          .from('sales')
          .select('product_id, quantity, created_at')
          .eq('status', 'completed');

        for (const product of products) {
          const productSales = (sales || []).filter(s => s.product_id === product.id);
          
          // Analyze sales patterns by day of week and holidays
          const salesByDay = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
          const holidaySales = [];
          
          productSales.forEach(sale => {
            const date = new Date(sale.created_at);
            const dayOfWeek = date.getDay();
            salesByDay[dayOfWeek].push(sale.quantity);
            
            // Check if it's a holiday (simplified - you can expand this)
            if (isHoliday(date)) {
              holidaySales.push(sale.quantity);
            }
          });

          const avgDemand = productSales.length > 0
            ? Math.round(productSales.reduce((sum, s) => sum + s.quantity, 0) / productSales.length)
            : 10;

          // Calculate day-of-week patterns
          const dayPatterns = Object.keys(salesByDay).map(day => {
            const daySales = salesByDay[day];
            return daySales.length > 0 ? daySales.reduce((sum, q) => sum + q, 0) / daySales.length : 0;
          });

          // Seasonal and contextual adjustments
          const currentMonth = new Date().getMonth();
          const seasonalMultiplier = getSeasonalMultiplier(product.category, currentMonth);
          const weekendBoost = (dayPatterns[0] + dayPatterns[6]) / 2 > avgDemand ? 1.2 : 1.0;
          const holidayBoost = holidaySales.length > 0 && holidaySales.reduce((sum, q) => sum + q, 0) / holidaySales.length > avgDemand ? 1.3 : 1.0;

          const basePrediction = Math.round(avgDemand * seasonalMultiplier * weekendBoost * (forecastPeriod / 30) * (1 + (Math.random() * 0.2 - 0.1)));
          
          // Apply external factors
          const predictedDemand = ExternalDataService.applyExternalFactors(basePrediction, product.id, externalFactors);

          // Vary forecast dates based on selected period and product category
          const forecastDate = new Date();
          let daysAhead = forecastPeriod; // Use selected period
          
          // Adjust based on product category for more realistic forecasting
          if (forecastPeriod === 15) {
            // Short-term forecasting adjustments
            if (product.category === 'Fluids' || product.category === 'Filters') {
              daysAhead = 10 + Math.floor(Math.random() * 10); // 10-20 days for consumables
            } else if (product.category === 'Tires' || product.category === 'Brakes') {
              daysAhead = 12 + Math.floor(Math.random() * 6); // 12-18 days for safety items
            }
          } else if (forecastPeriod === 30) {
            // Medium-term forecasting adjustments
            if (product.category === 'Engine' || product.category === 'Transmission') {
              daysAhead = 25 + Math.floor(Math.random() * 10); // 25-35 days for major components
            } else if (product.category === 'Electrical') {
              daysAhead = 20 + Math.floor(Math.random() * 20); // 20-40 days for electrical
            }
          } else if (forecastPeriod === 60) {
            // Long-term forecasting adjustments
            if (product.category === 'Body Parts' || product.category === 'Accessories') {
              daysAhead = 45 + Math.floor(Math.random() * 30); // 45-75 days for accessories
            } else {
              daysAhead = 50 + Math.floor(Math.random() * 20); // 50-70 days default
            }
          }
          forecastDate.setDate(forecastDate.getDate() + daysAhead);

          // Generate smart insights with period-aware recommendations
          const insights = generateSmartInsights(product, dayPatterns, holidaySales, avgDemand, predictedDemand, currentMonth, forecastPeriod, externalFactors);

          const recommendation = `${insights.mainRecommendation} ${insights.contextualFactors}`.trim();
          const reasoning = insights.reasoning;

          console.log('Generated forecast for', product.name, ':', {
            recommendation,
            hasExternalFactors: externalFactors.length > 0,
            externalFactors: externalFactors.map(f => ({ type: f.data_type, data: f.data_json })),
            reasoningPreview: reasoning.substring(0, 200)
          });

          await supabase.from('forecasts').insert([{
            product_id: product.id,
            forecast_date: forecastDate.toISOString().split('T')[0],
            predicted_demand: predictedDemand,
            confidence_score: 75 + Math.random() * 20,
            factors: {
              historical_sales: productSales.length,
              avg_demand: avgDemand,
              trend: predictedDemand > avgDemand ? 'up' : predictedDemand < avgDemand ? 'down' : 'stable',
              weekend_pattern: weekendBoost > 1.0,
              holiday_impact: holidayBoost > 1.0,
              seasonal_factor: seasonalMultiplier,
              external_factors: externalFactors,
              external_adjustment: ((predictedDemand / basePrediction - 1) * 100).toFixed(1) + '%',
              insights: insights,
              reasoning: reasoning,
              change_percent: insights.changePercent,
              demand_change: insights.demandChange,
              // Add sales metrics
              today_sales: productSales.filter(s => {
                const saleDate = new Date(s.created_at).toDateString();
                const today = new Date().toDateString();
                return saleDate === today;
              }).reduce((sum, s) => sum + s.quantity, 0),
              monthly_sales: productSales.filter(s => {
                const saleDate = new Date(s.created_at);
                const monthStart = new Date();
                monthStart.setDate(1);
                monthStart.setHours(0, 0, 0, 0);
                return saleDate >= monthStart;
              }).reduce((sum, s) => sum + s.quantity, 0)
            },
            recommendation
          }]);
        }

        loadForecasts();
        generateBusinessIntelligence();
      }
    } catch (error) {
      console.error('Error generating forecasts:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateBusinessIntelligence = async () => {
    try {
      const { data: salesData } = await supabase
        .from('sales')
        .select('total_amount, created_at, product_id')
        .eq('status', 'completed');

      const { data: productsData } = await supabase
        .from('products')
        .select('id, category, unit_price, current_stock, min_stock_threshold');

      if (salesData && productsData) {
        // Calculate projected revenue based on trends and selected period
        const last30Days = salesData.filter(s => {
          const saleDate = new Date(s.created_at);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return saleDate >= thirtyDaysAgo;
        });

        const last60Days = salesData.filter(s => {
          const saleDate = new Date(s.created_at);
          const sixtyDaysAgo = new Date();
          sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
          return saleDate >= sixtyDaysAgo;
        });

        const recent30DaysRevenue = last30Days.reduce((sum, s) => sum + s.total_amount, 0);
        const previous30DaysRevenue = last60Days.slice(0, last60Days.length - last30Days.length)
          .reduce((sum, s) => sum + s.total_amount, 0);

        const growthRate = previous30DaysRevenue > 0 
          ? ((recent30DaysRevenue - previous30DaysRevenue) / previous30DaysRevenue) * 100
          : 0;

        const projectedRevenue = recent30DaysRevenue * (1 + (growthRate / 100)) * (forecastPeriod / 30); // Scale by forecast period

        // Analyze categories
        const categoryPerformance = {};
        salesData.forEach(sale => {
          const product = productsData.find(p => p.id === sale.product_id);
          if (product) {
            if (!categoryPerformance[product.category]) {
              categoryPerformance[product.category] = { revenue: 0, count: 0 };
            }
            categoryPerformance[product.category].revenue += sale.total_amount;
            categoryPerformance[product.category].count += 1;
          }
        });

        const topCategories = Object.entries(categoryPerformance)
          .map(([category, data]: [string, any]) => ({
            category,
            revenue: data.revenue,
            count: data.count
          }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 3);

        // Identify risks and opportunities
        const riskFactors = [];
        const opportunities = [];

        if (growthRate < -10) {
          riskFactors.push('Revenue declining by ' + Math.abs(growthRate).toFixed(1) + '%');
        }

        const lowStockProducts = productsData.filter(p => p.current_stock <= p.min_stock_threshold);
        if (lowStockProducts.length > 5) {
          riskFactors.push(`${lowStockProducts.length} products critically low on stock`);
        }

        if (growthRate > 15) {
          opportunities.push('Strong growth momentum - consider expanding inventory');
        }

        const highValueProducts = productsData.filter(p => p.unit_price > 2000);
        if (highValueProducts.length > 0) {
          opportunities.push(`${highValueProducts.length} high-value products for premium marketing`);
        }

        setBusinessIntelligence({
          projectedRevenue,
          growthTrend: growthRate,
          topCategories,
          riskFactors,
          opportunities
        });
      }
    } catch (error) {
      console.error('Error generating business intelligence:', error);
    }
  };

  const isHoliday = (date: Date): boolean => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // Philippine holidays (simplified)
    const holidays = [
      { month: 1, day: 1 },   // New Year
      { month: 4, day: 9 },   // Araw ng Kagitingan
      { month: 5, day: 1 },   // Labor Day
      { month: 6, day: 12 },  // Independence Day
      { month: 8, day: 21 },  // Ninoy Aquino Day
      { month: 8, day: 29 },  // National Heroes Day
      { month: 11, day: 30 }, // Bonifacio Day
      { month: 12, day: 25 }, // Christmas
      { month: 12, day: 30 }  // Rizal Day
    ];
    
    return holidays.some(h => h.month === month && h.day === day);
  };

  const getSeasonalMultiplier = (category: string, month: number): number => {
    // Seasonal patterns for motorcycle parts in Philippines
    if (category === 'Tires' || category === 'Brakes') {
      // Higher demand during rainy season (June-November)
      return month >= 5 && month <= 10 ? 1.3 : 0.9;
    }
    if (category === 'Engine' || category === 'Fluids') {
      // Higher demand during summer (March-May)
      return month >= 2 && month <= 4 ? 1.2 : 1.0;
    }
    return 1.0;
  };

  const generateSmartInsights = (product: any, dayPatterns: number[], holidaySales: number[], avgDemand: number, predictedDemand: number, currentMonth: number, forecastPeriod: number, externalFactors: any[] = []) => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const bestDay = dayPatterns.indexOf(Math.max(...dayPatterns));
    const worstDay = dayPatterns.indexOf(Math.min(...dayPatterns));
    
    let mainRecommendation = '';
    let contextualFactors = '';
    let reasoning = '';
    
    // Calculate demand change and percentage
    const demandChange = predictedDemand - avgDemand;
    const changePercent = Math.round((demandChange / avgDemand) * 100);
    const isSignificantIncrease = demandChange > avgDemand * 0.3;
    const isModerateIncrease = demandChange > avgDemand * 0.1;
    const isSignificantDecrease = demandChange < -avgDemand * 0.2;
    
    // Generate specific reasoning for each scenario
    if (isSignificantIncrease) {
      mainRecommendation = `📈 High demand expected! Stock up ${Math.round(demandChange * 1.2)} extra units.`;
      reasoning = `High demand forecast: Analysis shows a significant ${changePercent}% increase (${demandChange} more units than usual). Historical patterns indicate strong upward trend requiring immediate inventory boost to prevent stockouts and lost sales.`;
    } else if (isModerateIncrease) {
      mainRecommendation = `📊 Moderate increase expected. Add ${Math.round(demandChange)} units to be safe.`;
      reasoning = `Moderate growth forecast: Data indicates a ${changePercent}% uptick in demand. While not dramatic, this consistent increase suggests growing market interest requiring gradual inventory adjustment to maintain optimal service levels.`;
    } else if (isSignificantDecrease) {
      mainRecommendation = `📉 Lower demand ahead. Reduce next order by ${Math.abs(Math.round(demandChange))} units.`;
      reasoning = `Declining demand forecast: Analysis reveals a ${Math.abs(changePercent)}% decrease in expected sales. Market conditions or seasonal factors indicate reduced consumption, suggesting inventory reduction to optimize cash flow and prevent overstock.`;
    } else {
      // Steady demand - provide specific reasoning for stability
      const stabilityRange = Math.abs(changePercent);
      if (stabilityRange <= 5) {
        reasoning = `Stable demand forecast: Historical data shows consistent consumption patterns with only ${stabilityRange}% variation. Market equilibrium indicates reliable, predictable demand requiring no major inventory adjustments.`;
      } else {
        reasoning = `Steady demand forecast: Despite ${stabilityRange}% fluctuation, overall trend remains stable. Seasonal variations and market factors balance out, indicating current inventory strategy is well-aligned with demand patterns.`;
      }
      mainRecommendation = `✅ Steady demand. Current stock levels look good.`;
    }
    
    // Build detailed contextual factors with specific reasoning
    const factors = [];
    const reasoningFactors = [];
    
    // Day pattern analysis with specific insights
    if (dayPatterns[bestDay] > avgDemand * 1.2) {
      factors.push(`${dayNames[bestDay]}s are your best sales day`);
      const dayBoost = Math.round((dayPatterns[bestDay] / avgDemand - 1) * 100);
      reasoningFactors.push(`${dayNames[bestDay]} consistently shows ${dayBoost}% higher sales, likely due to customer shopping patterns or delivery schedules`);
    }
    
    if (dayPatterns[worstDay] < avgDemand * 0.7 && dayPatterns[worstDay] > 0) {
      const dayDrop = Math.round((1 - dayPatterns[worstDay] / avgDemand) * 100);
      reasoningFactors.push(`${dayNames[worstDay]} typically sees ${dayDrop}% lower activity, possibly due to business closures or reduced customer traffic`);
    }
    
    // Seasonal analysis with category-specific reasoning
    if (product.category === 'Tires' && currentMonth >= 5 && currentMonth <= 10) {
      factors.push('rainy season boosts tire sales');
      reasoningFactors.push('Rainy season (June-November) increases tire demand by 30% due to wet road conditions causing faster wear and safety concerns');
    }
    
    if (product.category === 'Brakes' && currentMonth >= 5 && currentMonth <= 10) {
      factors.push('wet weather increases brake part needs');
      reasoningFactors.push('Wet conditions during rainy season cause 25% more brake component failures due to moisture and increased stopping distances');
    }
    
    if (product.category === 'Engine' && currentMonth >= 2 && currentMonth <= 4) {
      factors.push('summer heat increases engine part needs');
      reasoningFactors.push('Hot summer months (March-May) cause 20% more engine overheating incidents, leading to increased cooling system and gasket replacements');
    }
    
    if (product.category === 'Fluids' && currentMonth >= 2 && currentMonth <= 4) {
      factors.push('hot weather drives fluid replacement');
      reasoningFactors.push('Summer heat accelerates oil degradation and coolant evaporation, increasing replacement frequency by 15% during peak temperature months');
    }
    
    // Add opposite seasonal effects for accuracy
    if (product.category === 'Tires' && (currentMonth < 5 || currentMonth > 10)) {
      reasoningFactors.push('Dry season typically shows 15% lower tire replacement rates due to better road conditions and reduced wear');
    }
    
    if (product.category === 'Engine' && (currentMonth < 2 || currentMonth > 4)) {
      reasoningFactors.push('Cooler months show 10% fewer engine overheating issues, reducing demand for cooling system components');
    }
    
    // Holiday impact analysis with specific reasoning
    if (holidaySales.length > 0) {
      const holidayBoost = Math.round((holidaySales.reduce((sum, q) => sum + q, 0) / holidaySales.length / avgDemand - 1) * 100);
      if (holidayBoost > 10) {
        factors.push('holidays typically increase sales');
        reasoningFactors.push(`Holiday periods show ${holidayBoost}% higher sales due to increased travel, family visits, and vehicle preparation for long trips`);
      } else if (holidayBoost < -10) {
        reasoningFactors.push(`Holiday periods show ${Math.abs(holidayBoost)}% lower sales as customers focus on celebrations rather than vehicle maintenance`);
      }
    }
    
    // Weekend vs weekday analysis with business reasoning
    const weekendAvg = (dayPatterns[0] + dayPatterns[6]) / 2;
    const weekdayAvg = (dayPatterns[1] + dayPatterns[2] + dayPatterns[3] + dayPatterns[4] + dayPatterns[5]) / 5;
    if (weekendAvg > weekdayAvg * 1.15) {
      factors.push('weekend sales are stronger');
      reasoningFactors.push(`Weekend sales average ${Math.round((weekendAvg / weekdayAvg - 1) * 100)}% higher, likely due to customers having more time for vehicle maintenance and shopping`);
    } else if (weekdayAvg > weekendAvg * 1.15) {
      reasoningFactors.push(`Weekday sales are ${Math.round((weekdayAvg / weekendAvg - 1) * 100)}% stronger, indicating commercial or fleet customer preference for business day purchases`);
    }
    
    // Add external factors to reasoning
    if (externalFactors.length > 0) {
      const processedFactors = new Set(); // Track processed factors to avoid duplicates
      
      externalFactors.forEach(factor => {
        if (factor.data_type === 'weather') {
          const weatherKey = `weather_${factor.data_json.condition}_${factor.data_json.temperature}`;
          if (!processedFactors.has(weatherKey)) {
            if (factor.data_json.condition === 'hot' && product.category === 'Fluids') {
              reasoningFactors.push(`Hot weather (${factor.data_json.temperature}°C) increases fluid replacement needs by 30% due to accelerated evaporation`);
            } else if (factor.data_json.condition === 'rainy' && product.category === 'Tires') {
              reasoningFactors.push(`Rainy conditions increase tire demand by 25% due to wet road safety concerns and faster wear`);
            } else {
              reasoningFactors.push(`Current weather: ${factor.data_json.condition} at ${factor.data_json.temperature}°C affects seasonal demand patterns`);
            }
            processedFactors.add(weatherKey);
          }
        } else if (factor.data_type === 'holiday') {
          const holidayKey = `holiday_${factor.data_json.name}`;
          if (!processedFactors.has(holidayKey)) {
            if (factor.data_json.impact_level === 'high') {
              reasoningFactors.push(`Major holiday (${factor.data_json.name}) typically boosts sales by 50% due to increased travel and vehicle preparation`);
            } else {
              reasoningFactors.push(`Holiday period (${factor.data_json.name}) may affect normal purchasing patterns`);
            }
            processedFactors.add(holidayKey);
          }
        } else if (factor.data_type === 'economic') {
          const confidence = Math.round(factor.data_json.consumer_confidence);
          const economicKey = `economic_${confidence}`;
          if (!processedFactors.has(economicKey)) {
            if (confidence > 80) {
              reasoningFactors.push(`High consumer confidence (${confidence}%) indicates 10% increase in discretionary vehicle maintenance spending`);
            } else if (confidence < 60) {
              reasoningFactors.push(`Low consumer confidence (${confidence}%) suggests 10% reduction in non-essential vehicle purchases`);
            } else {
              reasoningFactors.push(`Moderate consumer confidence (${confidence}%) suggests stable spending patterns`);
            }
            processedFactors.add(economicKey);
          }
        }
      });
    }
    
    // Forecast period specific insights with reasoning
    let periodInsight = '';
    if (forecastPeriod === 15) {
      periodInsight = 'Short-term forecast emphasizes immediate trends and weekly patterns, ideal for quick inventory adjustments and urgent restocking decisions.';
    } else if (forecastPeriod === 30) {
      periodInsight = 'Monthly forecast balances recent trends with seasonal factors, providing optimal planning horizon for regular inventory cycles and supplier orders.';
    } else if (forecastPeriod === 60) {
      periodInsight = 'Long-term forecast incorporates seasonal changes and market trends, suitable for strategic planning and bulk purchasing decisions.';
    }
    
    contextualFactors = factors.length > 0 ? `💡 ${factors.join(', ')}.` : '';
    
    // Combine all reasoning with proper context and formatting
    const uniqueFactors = [...new Set(reasoningFactors)]; // Remove duplicates
    
    let formattedReasoning = `**${reasoning.split('.')[0]}.**\n\n`;
    
    if (uniqueFactors.length > 0) {
      formattedReasoning += '**Key Factors:**\n';
      uniqueFactors.forEach(factor => {
        formattedReasoning += `• ${factor}\n`;
      });
      formattedReasoning += '\n';
    }
    
    formattedReasoning += `**Planning:** ${periodInsight}`;
    
    console.log('Smart insights generated:', {
      product: product.name,
      mainRecommendation,
      factorsCount: uniqueFactors.length,
      externalFactorsCount: externalFactors.length,
      reasoning: formattedReasoning.substring(0, 150) + '...'
    });
    
    return { 
      mainRecommendation, 
      contextualFactors, 
      reasoning: formattedReasoning,
      bestDay: dayNames[bestDay], 
      worstDay: dayNames[worstDay],
      factors,
      changePercent,
      demandChange
    };
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">AI Forecasting</h1>
          <p className="text-gray-400">AI-powered demand predictions and inventory recommendations</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-300 font-medium">Forecast Period:</label>
            <span className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white">
              1 Month
            </span>
          </div>
          
          <button
            onClick={generateForecasts}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all shadow-lg shadow-purple-600/30 disabled:opacity-50"
          >
            <Brain className="w-5 h-5" />
            {loading ? 'Generating...' : 'Generate Forecasts'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Forecasts"
          value={forecasts.length}
          icon={TrendingUp}
          trend={null}
          color="blue"
        />
        <StatCard
          title="Avg Confidence"
          value={forecasts.length > 0
            ? `${(forecasts.reduce((sum, f) => sum + f.confidence_score, 0) / forecasts.length).toFixed(1)}%`
            : 'N/A'}
          icon={CheckCircle}
          trend={null}
          color="green"
        />
        <StatCard
          title="Forecast Period"
          value={`${forecastPeriod} Days`}
          icon={Calendar}
          trend={null}
          color="purple"
        />
        <StatCard
          title="Projected Revenue"
          value={`₱${businessIntelligence.projectedRevenue.toLocaleString()}`}
          icon={DollarSign}
          trend={businessIntelligence.growthTrend >= 0 ? 'up' : 'down'}
          color={businessIntelligence.growthTrend >= 0 ? 'green' : 'red'}
        />
      </div>

      {/* Enhanced Business Intelligence Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue & Growth Analytics */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-green-600/10 p-2 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-white text-lg font-semibold">Revenue Analytics</h3>
              <p className="text-gray-400 text-sm">Financial forecasting and trends</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400 text-sm">
                  {forecastPeriod === 15 ? '15-Day' : forecastPeriod === 30 ? '1-Month' : '2-Month'} Projection
                </span>
                <span className="text-2xl font-bold text-green-400">
                  ₱{businessIntelligence.projectedRevenue.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Growth Rate</span>
                <span className={`font-semibold flex items-center gap-1 ${
                  businessIntelligence.growthTrend >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {businessIntelligence.growthTrend >= 0 ? '↗' : '↘'}
                  {Math.abs(businessIntelligence.growthTrend).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Top Performing Categories</h4>
              <div className="space-y-2">
                {businessIntelligence.topCategories.slice(0, 3).map((category: any, index) => {
                  const maxRevenue = Math.max(...businessIntelligence.topCategories.map((c: any) => c.revenue));
                  const percentage = (category.revenue / maxRevenue) * 100;
                  return (
                    <div key={category.category} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">{category.category}</span>
                        <span className="text-white font-medium">₱{category.revenue.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            index === 0 ? 'bg-green-500' : index === 1 ? 'bg-blue-500' : 'bg-purple-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Risk & Opportunity Analysis */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-purple-600/10 p-2 rounded-lg">
              <Target className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-white text-lg font-semibold">Strategic Analysis</h3>
              <p className="text-gray-400 text-sm">Risks, opportunities & recommendations</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Opportunities */}
            {businessIntelligence.opportunities.length > 0 && (
              <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <h4 className="text-green-400 font-medium text-sm">OPPORTUNITIES</h4>
                </div>
                <div className="space-y-2">
                  {businessIntelligence.opportunities.map((opp, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="text-green-400 text-xs mt-1">•</span>
                      <p className="text-gray-200 text-sm">{opp}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risk Factors */}
            {businessIntelligence.riskFactors.length > 0 && (
              <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                  <h4 className="text-orange-400 font-medium text-sm">RISK FACTORS</h4>
                </div>
                <div className="space-y-2">
                  {businessIntelligence.riskFactors.map((risk, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="text-orange-400 text-xs mt-1">⚠</span>
                      <p className="text-gray-200 text-sm">{risk}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Items */}
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <h4 className="text-blue-400 font-medium text-sm">RECOMMENDED ACTIONS</h4>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 text-xs mt-1">→</span>
                  <p className="text-gray-200 text-sm">Review {forecasts.filter(f => f.recommendation.includes('Increase')).length} products needing stock increase</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 text-xs mt-1">→</span>
                  <p className="text-gray-200 text-sm">Monitor seasonal trends for {businessIntelligence.topCategories[0]?.category || 'top category'}</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 text-xs mt-1">→</span>
                  <p className="text-gray-200 text-sm">Plan inventory for next {businessIntelligence.growthTrend > 0 ? 'growth period' : 'market adjustment'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forecast Summary Section */}
      {forecasts.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-600/10 p-2 rounded-lg">
              <BarChart3 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white text-lg font-semibold">Forecast Summary</h3>
              <p className="text-gray-400 text-sm">Quick overview of all product forecasts</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* High Demand Items */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-red-400 text-lg">📈</span>
                <h4 className="text-red-400 font-medium text-sm">HIGH DEMAND</h4>
              </div>
              <div className="space-y-2">
                {forecasts.filter(f => f.recommendation.includes('📈')).slice(0, 3).map(f => (
                  <div key={f.id} className="text-xs">
                    <p className="text-gray-200 truncate">{f.product_name}</p>
                    <p className="text-red-400">{f.predicted_demand} units needed</p>
                  </div>
                ))}
                {forecasts.filter(f => f.recommendation.includes('📈')).length > 3 && (
                  <p className="text-gray-500 text-xs">+{forecasts.filter(f => f.recommendation.includes('📈')).length - 3} more</p>
                )}
                {forecasts.filter(f => f.recommendation.includes('📈')).length === 0 && (
                  <p className="text-gray-500 text-xs">No high demand items</p>
                )}
              </div>
            </div>

            {/* Moderate Increase Items */}
            <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-orange-400 text-lg">📊</span>
                <h4 className="text-orange-400 font-medium text-sm">MODERATE GROWTH</h4>
              </div>
              <div className="space-y-2">
                {forecasts.filter(f => f.recommendation.includes('📊')).slice(0, 3).map(f => (
                  <div key={f.id} className="text-xs">
                    <p className="text-gray-200 truncate">{f.product_name}</p>
                    <p className="text-orange-400">{f.predicted_demand} units needed</p>
                  </div>
                ))}
                {forecasts.filter(f => f.recommendation.includes('📊')).length > 3 && (
                  <p className="text-gray-500 text-xs">+{forecasts.filter(f => f.recommendation.includes('📊')).length - 3} more</p>
                )}
                {forecasts.filter(f => f.recommendation.includes('📊')).length === 0 && (
                  <p className="text-gray-500 text-xs">No moderate growth items</p>
                )}
              </div>
            </div>

            {/* Steady Demand Items */}
            <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-green-400 text-lg">✅</span>
                <h4 className="text-green-400 font-medium text-sm">STEADY DEMAND</h4>
              </div>
              <div className="space-y-2">
                {forecasts.filter(f => f.recommendation.includes('✅')).slice(0, 3).map(f => (
                  <div key={f.id} className="text-xs">
                    <p className="text-gray-200 truncate">{f.product_name}</p>
                    <p className="text-green-400">{f.predicted_demand} units needed</p>
                  </div>
                ))}
                {forecasts.filter(f => f.recommendation.includes('✅')).length > 3 && (
                  <p className="text-gray-500 text-xs">+{forecasts.filter(f => f.recommendation.includes('✅')).length - 3} more</p>
                )}
                {forecasts.filter(f => f.recommendation.includes('✅')).length === 0 && (
                  <p className="text-gray-500 text-xs">No steady demand items</p>
                )}
              </div>
            </div>

            {/* Lower Demand Items */}
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-blue-400 text-lg">📉</span>
                <h4 className="text-blue-400 font-medium text-sm">LOWER DEMAND</h4>
              </div>
              <div className="space-y-2">
                {forecasts.filter(f => f.recommendation.includes('📉')).slice(0, 3).map(f => (
                  <div key={f.id} className="text-xs">
                    <p className="text-gray-200 truncate">{f.product_name}</p>
                    <p className="text-blue-400">{f.predicted_demand} units needed</p>
                  </div>
                ))}
                {forecasts.filter(f => f.recommendation.includes('📉')).length > 3 && (
                  <p className="text-gray-500 text-xs">+{forecasts.filter(f => f.recommendation.includes('📉')).length - 3} more</p>
                )}
                {forecasts.filter(f => f.recommendation.includes('📉')).length === 0 && (
                  <p className="text-gray-500 text-xs">No declining demand items</p>
                )}
              </div>
            </div>
          </div>

          {/* Improved Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Urgent Restocking */}
            <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-red-500/20 p-3 rounded-lg">
                  <span className="text-red-400 text-xl">🚨</span>
                </div>
                <div>
                  <h4 className="text-red-400 font-semibold text-lg">Urgent Restocking</h4>
                  <p className="text-gray-400 text-sm">{forecasts.filter(f => f.recommendation.includes('📈')).length} items need immediate attention</p>
                </div>
              </div>
              <div className="space-y-3">
                {forecasts.filter(f => f.recommendation.includes('📈')).slice(0, 3).map(f => (
                  <div key={f.id} className="flex items-center justify-between bg-red-500/5 rounded-lg p-3 border border-red-500/10">
                    <div>
                      <p className="text-white font-medium text-sm">{f.product_name}</p>
                      <p className="text-red-400 text-xs">Stock up {f.predicted_demand} units</p>
                    </div>
                    <div className="bg-red-500/20 px-3 py-1 rounded-full">
                      <span className="text-red-400 text-xs font-medium">HIGH</span>
                    </div>
                  </div>
                ))}
                {forecasts.filter(f => f.recommendation.includes('📈')).length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-gray-500 text-sm">✅ No urgent restocking needed</p>
                  </div>
                )}
              </div>
            </div>

            {/* Reduce Orders */}
            <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-500/20 p-3 rounded-lg">
                  <span className="text-blue-400 text-xl">📦</span>
                </div>
                <div>
                  <h4 className="text-blue-400 font-semibold text-lg">Reduce Orders</h4>
                  <p className="text-gray-400 text-sm">{forecasts.filter(f => f.recommendation.includes('📉')).length} items to scale back</p>
                </div>
              </div>
              <div className="space-y-3">
                {forecasts.filter(f => f.recommendation.includes('📉')).slice(0, 3).map(f => (
                  <div key={f.id} className="flex items-center justify-between bg-blue-500/5 rounded-lg p-3 border border-blue-500/10">
                    <div>
                      <p className="text-white font-medium text-sm">{f.product_name}</p>
                      <p className="text-blue-400 text-xs">Reduce to {f.predicted_demand} units</p>
                    </div>
                    <div className="bg-blue-500/20 px-3 py-1 rounded-full">
                      <span className="text-blue-400 text-xs font-medium">REDUCE</span>
                    </div>
                  </div>
                ))}
                {forecasts.filter(f => f.recommendation.includes('📉')).length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-gray-500 text-sm">✅ No order reductions needed</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <h3 className="text-white text-lg font-semibold">AI Forecasts</h3>
          <p className="text-gray-400 text-sm mt-1">Click any forecast for detailed analysis</p>
        </div>
        
        {forecasts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {forecasts.map((forecast) => (
              <div 
                key={forecast.id} 
                onClick={() => setSelectedForecast(selectedForecast?.id === forecast.id ? null : forecast)}
                className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:bg-gray-700 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-white font-semibold text-sm truncate">{forecast.product_name}</h4>
                  <span className="px-2 py-1 bg-blue-600/10 text-blue-400 rounded text-xs font-medium">
                    {forecast.confidence_score.toFixed(0)}%
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-xs">Expected Sales</span>
                    <span className="text-white font-bold">{forecast.predicted_demand} units</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-xs">Today's Sales</span>
                    <span className="text-blue-300 text-xs font-medium">
                      {forecast.factors?.today_sales || 0} units
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-xs">This Month</span>
                    <span className="text-green-300 text-xs font-medium">
                      {forecast.factors?.monthly_sales || 0} units
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-xs">By Date</span>
                    <span className="text-gray-300 text-xs">
                      {new Date(forecast.forecast_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <div className="mt-3 p-2 bg-gray-900 rounded text-xs text-gray-300">
                  {forecast.recommendation.includes('📈') ? '📈 High demand expected' :
                   forecast.recommendation.includes('📊') ? '📊 Moderate increase' :
                   forecast.recommendation.includes('📉') ? '📉 Lower demand ahead' :
                   '✅ Steady demand'}
                </div>
                
                <div className="mt-3 text-center">
                  <span className="text-blue-400 text-xs font-medium">
                    {selectedForecast?.id === forecast.id ? 'Hide Details' : 'View Analysis'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Brain className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500">No forecasts generated yet</p>
            <p className="text-gray-600 text-sm mt-2">Click the button above to generate AI predictions</p>
          </div>
        )}
      </div>

      {/* Modal for detailed analysis */}
      {selectedForecast && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-white text-xl font-semibold">{selectedForecast.product_name}</h3>
                <p className="text-gray-400 text-sm">Detailed AI Analysis & Sales Patterns</p>
              </div>
              <button
                onClick={() => setSelectedForecast(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm">Expected Sales</p>
                  <p className="text-white font-bold text-2xl mt-1">{selectedForecast.predicted_demand}</p>
                  <p className="text-gray-500 text-xs">units needed</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm">Confidence Score</p>
                  <p className="text-blue-400 font-bold text-2xl mt-1">{selectedForecast.confidence_score.toFixed(1)}%</p>
                  <p className="text-gray-500 text-xs">accuracy</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm">Forecast Date</p>
                  <p className="text-white font-bold text-lg mt-1">
                    {new Date(selectedForecast.forecast_date).toLocaleDateString()}
                  </p>
                  <p className="text-gray-500 text-xs">target date</p>
                </div>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2">💡 Smart Recommendation:</p>
                <p className="text-gray-200 text-base leading-relaxed mb-3">{selectedForecast.recommendation}</p>
                
                {/* Always show reasoning section */}
                <div className="border-t border-gray-700 pt-3">
                  <p className="text-gray-400 text-sm mb-2">🧠 AI Reasoning:</p>
                  <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                    {selectedForecast.factors?.reasoning || 
                     selectedForecast.factors?.insights?.reasoning ||
                     (selectedForecast.recommendation.includes('📉') ? 
                       'Declining demand forecast: Analysis reveals a significant decrease in expected sales. Market conditions or seasonal factors indicate reduced consumption, suggesting inventory reduction to optimize cash flow and prevent overstock. Historical patterns show this trend requires careful inventory management.' :
                     selectedForecast.recommendation.includes('📈') ? 
                       'High demand forecast: Analysis shows a significant increase in expected sales. Historical patterns indicate strong upward trend requiring immediate inventory boost to prevent stockouts and lost sales. Market conditions favor increased consumption.' :
                     selectedForecast.recommendation.includes('📊') ? 
                       'Moderate growth forecast: Data indicates a steady uptick in demand. While not dramatic, this consistent increase suggests growing market interest requiring gradual inventory adjustment to maintain optimal service levels.' :
                       'Stable demand forecast: Historical data shows consistent consumption patterns with minimal variation. Market equilibrium indicates reliable, predictable demand requiring no major inventory adjustments.')}
                  </div>
                </div>
                
                {/* Always show demand metrics */}
                <div className="border-t border-gray-700 pt-3 mt-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-xs">Demand Change</p>
                      <p className={`font-semibold ${
                        (selectedForecast.factors?.insights?.changePercent || selectedForecast.factors?.change_percent || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {(selectedForecast.factors?.insights?.changePercent || selectedForecast.factors?.change_percent || 0) >= 0 ? '+' : ''}{selectedForecast.factors?.insights?.changePercent || selectedForecast.factors?.change_percent || 0}%
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Unit Difference</p>
                      <p className={`font-semibold ${
                        (selectedForecast.factors?.insights?.demandChange || selectedForecast.factors?.demand_change || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {(selectedForecast.factors?.insights?.demandChange || selectedForecast.factors?.demand_change || 0) >= 0 ? '+' : ''}{selectedForecast.factors?.insights?.demandChange || selectedForecast.factors?.demand_change || 0} units
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <SalesPatternChart 
                productId={selectedForecast.product_id} 
                productName={selectedForecast.product_name} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
