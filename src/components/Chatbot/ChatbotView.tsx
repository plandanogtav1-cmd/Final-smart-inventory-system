import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Send, Bot, User, Loader, RotateCcw, Lightbulb, TrendingUp, Package, AlertTriangle } from 'lucide-react';

interface Message {
  id: string;
  message: string;
  response: string;
  created_at: string;
}

const SUGGESTED_QUESTIONS = [
  { icon: Package, text: 'Which products are running low on stock?', category: 'Inventory' },
  { icon: TrendingUp, text: 'What are my top 5 best-selling products?', category: 'Sales' },
  { icon: TrendingUp, text: 'How much revenue did I make today?', category: 'Sales' },
  { icon: Package, text: 'What is my total inventory value?', category: 'Inventory' },
  { icon: AlertTriangle, text: 'Do I need to restock any products?', category: 'Alerts' },
  { icon: TrendingUp, text: 'Who are my top customers by purchase value?', category: 'Customers' },
  { icon: Package, text: 'How many products do I have in each category?', category: 'Inventory' },
  { icon: TrendingUp, text: 'What was my sales performance this month?', category: 'Sales' },
  { icon: AlertTriangle, text: 'What active alerts do I have?', category: 'Alerts' },
  { icon: Package, text: 'Which products have zero stock?', category: 'Inventory' },
  { icon: TrendingUp, text: 'What is my average order value?', category: 'Sales' },
  { icon: Package, text: 'Which suppliers have the highest ratings?', category: 'Suppliers' },
  { icon: TrendingUp, text: 'Show me my weekly sales report', category: 'Sales' },
  { icon: Package, text: 'What products need immediate restocking?', category: 'Inventory' },
  { icon: TrendingUp, text: 'How many transactions did I have today?', category: 'Sales' },
  { icon: Package, text: 'Find products by name or category', category: 'Search' },
  { icon: TrendingUp, text: 'What will be my sales forecast for next month?', category: 'Forecast' },
  { icon: Package, text: 'Which products should I order more of?', category: 'Forecast' }
];

export default function ChatbotView() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChatHistory();
  }, [user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = async () => {
    const { data } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: true });

    if (data && data.length > 0) {
      setMessages(data);
      setShowSuggestions(false);
    } else {
      setMessages([]);
      setShowSuggestions(true);
    }
  };

  const clearChat = async () => {
    if (confirm('Are you sure you want to permanently delete all chat history? This cannot be undone.')) {
      try {
        const { error } = await supabase
          .from('chat_history')
          .delete()
          .eq('user_id', user?.id);
        
        if (!error) {
          setMessages([]);
          setShowSuggestions(true);
          alert('✅ Chat history permanently deleted.');
        } else {
          alert('Failed to clear chat history.');
        }
      } catch (error) {
        alert('Failed to clear chat history.');
      }
    }
  };

  const processQuery = async (query: string): Promise<string> => {
    const lowerQuery = query.toLowerCase();
    
    // Check for random keyboard input
    const isRandomLetters = (text: string): boolean => {
      const cleanText = text.replace(/[^a-zA-Z]/g, '');
      if (cleanText.length < 10) return false;
      
      const patterns = [
        /^[qwertyuiop]{8,}$/i,
        /^[asdfghjkl]{8,}$/i,
        /^[zxcvbnm]{8,}$/i,
        /([a-z])\1{5,}/i,
        /^(qwerty|asdf|zxcv){2,}/i
      ];
      
      return patterns.some(pattern => pattern.test(cleanText));
    };
    
    if (isRandomLetters(query)) {
      const funnyResponses = [
        "🤖 Hmm, that looks like keyboard gymnastics! Try asking about your inventory instead.",
        "🎹 Nice keyboard solo! But I'm better with business questions like 'What are my top products?'",
        "⌨️ I see you're testing my patience! Ask me something useful like 'Which products need restocking?'",
        "🤔 That's either a secret code or random typing. Try 'How much revenue did I make today?' instead!",
        "🎯 Let's focus! Ask me about your business: sales, inventory, customers, or suppliers."
      ];
      
      return funnyResponses[Math.floor(Math.random() * funnyResponses.length)] + 
             "\n\n💡 **Try asking:**\n• Which products are low on stock?\n• What are my best-selling items?\n• How much is my inventory worth?";
    }
    
    // Enhanced keyword mapping
    const keywordMap = {
      // Stock/Inventory shortcuts
      'stok': 'stock', 'stck': 'stock', 'inv': 'inventory', 'invntry': 'inventory',
      'prodcts': 'products', 'prodct': 'product', 'prods': 'products', 'itms': 'items',
      // Sales/Revenue shortcuts
      'sles': 'sales', 'sal': 'sales', 'revnu': 'revenue', 'rev': 'revenue',
      'prft': 'profit', 'earn': 'revenue', 'made': 'revenue', 'income': 'revenue',
      // Time shortcuts
      'mnth': 'month', 'mth': 'month', 'mo': 'month', 'wk': 'week', 'dy': 'day',
      'yr': 'year', 'tdy': 'today', 'yday': 'yesterday',
      // Common shortcuts
      'custmr': 'customer', 'cust': 'customer', 'supplr': 'supplier', 'supp': 'supplier',
      'qty': 'quantity', 'pcs': 'pieces', 'u': 'you', 'ur': 'your', 'r': 'are',
      'wat': 'what', 'hw': 'how', 'y': 'why', 'wen': 'when', 'wer': 'where',
      'shw': 'show', 'tel': 'tell', 'gt': 'get', 'fnd': 'find', 'srch': 'search',
      // Business shortcuts
      'low': 'low', 'hi': 'high', 'top': 'top', 'best': 'best', 'avg': 'average',
      'ttl': 'total', 'val': 'value', 'wrth': 'worth', 'prc': 'price'
    };
    
    let processedQuery = lowerQuery;
    Object.entries(keywordMap).forEach(([key, value]) => {
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      processedQuery = processedQuery.replace(regex, value);
    });
    
    // Forecast queries - put these early in detection
    if (/\b(forecast|predict|future|prediction)\b/.test(processedQuery)) {
      return await handleSalesForecast();
    }
    
    if (/\b(order more|should.*order|recommend.*order|restock.*recommend)\b/.test(processedQuery)) {
      return await handleOrderRecommendations();
    }
    
    // Enhanced intent detection
    // Categories - improved pattern matching
    if ((/\b(categor|group|type)\b/.test(processedQuery) && /\b(products?|items?|how many|count)\b/.test(processedQuery)) ||
        /\bcategor\b/.test(processedQuery) ||
        /\bhow many.*products.*categor/.test(processedQuery) ||
        /\bproducts.*each.*categor/.test(processedQuery)) {
      return await handleCategoryBreakdown();
    }
    
    // Transactions - improved pattern matching
    if ((/\b(transaction|order)\b/.test(processedQuery) && /\b(today|count|how many)\b/.test(processedQuery)) ||
        /\bhow many.*transaction/.test(processedQuery) ||
        /\btransaction.*today/.test(processedQuery)) {
      return await handleTodayTransactions();
    }
    
    // Alerts - improved pattern matching
    if (/\b(alert|notification|warning|problem|active.*alert)\b/.test(processedQuery) ||
        /\bactive.*alert/.test(processedQuery) ||
        /\balert.*active/.test(processedQuery)) {
      return await handleAlerts();
    }
    
    // Customers - improved pattern matching
    if (/\b(customer|client|buyer|top customer)\b/.test(processedQuery) ||
        /\btop.*customer/.test(processedQuery) ||
        /\bcustomer.*purchase/.test(processedQuery)) {
      return await handleCustomers();
    }
    
    // Suppliers - improved pattern matching
    if (/\b(supplier|vendor|rating)\b/.test(processedQuery) ||
        /\bsupplier.*rating/.test(processedQuery) ||
        /\bhighest.*rating/.test(processedQuery)) {
      return await handleSuppliers();
    }
    
    // Product search/browse - improved pattern matching
    if (/\b(find|search|browse|show)\b.*\b(product|item)/.test(processedQuery) ||
        /\bproduct.*name/.test(processedQuery) ||
        /\bfind.*categor/.test(processedQuery)) {
      return await handleProductBrowse();
    }
    // Top/Best products
    if (/\b(top|best|highest|most)\b.*\b(products?|items?|selling)\b/.test(processedQuery) ||
        /\b(products?|items?)\b.*\b(top|best|highest|most)\b/.test(processedQuery)) {
      return await handleTopProducts();
    }
    
    // Low stock/restock
    if ((/\b(low|running low|restock|need|empty|out)\b/.test(processedQuery) &&
         /\b(stock|inventory|products?)\b/.test(processedQuery)) ||
        /\brestock\b/.test(processedQuery)) {
      return await handleLowStock();
    }
    
    // Sales queries with flexible patterns
    if (/\b(sales?|revenue|income|made|earn)\b/.test(processedQuery)) {
      if (/\b(today|daily|day)\b/.test(processedQuery)) return await handleTodaySales();
      if (/\b(month|monthly|this month)\b/.test(processedQuery)) return await handleMonthlySales();
      if (/\b(week|weekly|this week)\b/.test(processedQuery)) return await handleWeeklySales();
      return await handleTodaySales(); // Default to today
    }
    
    // Simple shortcuts
    if (/^(sales|sal|sles)\s+(month|mnth|mo)$/i.test(query.trim())) return await handleMonthlySales();
    if (/^(sales|sal|sles)\s+(week|wk)$/i.test(query.trim())) return await handleWeeklySales();
    if (/^(sales|sal|sles)\s+(today|tdy|dy)$/i.test(query.trim())) return await handleTodaySales();
    
    // Inventory value
    if ((/\b(inventory|stock)\b/.test(processedQuery) && /\b(value|worth|cost|price|total)\b/.test(processedQuery)) ||
        /\binv\s+val\b/.test(processedQuery)) {
      return await handleInventoryValue();
    }
    
    // Categories
    if ((/\b(categor|group|type)\b/.test(processedQuery) && /\b(products?|items?|how many|count)\b/.test(processedQuery)) ||
        /\bcategor\b/.test(processedQuery)) {
      return await handleCategoryBreakdown();
    }
    
    // Customers
    if (/\b(customer|client|buyer|top customer)\b/.test(processedQuery)) {
      return await handleCustomers();
    }
    
    // Alerts
    if (/\b(alert|notification|warning|problem)\b/.test(processedQuery)) {
      return await handleAlerts();
    }
    
    // Average order
    if (/\b(average|avg)\b/.test(processedQuery) && /\b(order|sale|transaction)\b/.test(processedQuery)) {
      return await handleAverageOrder();
    }
    
    // Suppliers
    if (/\b(supplier|vendor|rating)\b/.test(processedQuery)) {
      return await handleSuppliers();
    }
    
    // Zero stock
    if ((/\b(zero|empty|out)\b/.test(processedQuery) && /\b(stock|inventory)\b/.test(processedQuery)) ||
        /\bzero\s+stock\b/.test(processedQuery)) {
      return await handleZeroStock();
    }
    
    // Transactions
    if (/\b(transaction|order)\b/.test(processedQuery) && /\b(today|count|how many)\b/.test(processedQuery)) {
      return await handleTodayTransactions();
    }
    
    // Forecast queries
    if (/\b(forecast|predict|future|next month|next week)\b/.test(processedQuery) &&
        /\b(sales?|revenue|demand)\b/.test(processedQuery)) {
      return await handleSalesForecast();
    }
    
    if (/\b(order more|should.*order|recommend.*order)\b/.test(processedQuery)) {
      return await handleOrderRecommendations();
    }
    
    // Simple fallbacks
    if (/\bstock\b/.test(processedQuery)) {
      if (/\blow\b/.test(processedQuery)) return await handleLowStock();
      if (/\bvalue\b/.test(processedQuery)) return await handleInventoryValue();
      return await handleLowStock();
    }
    
    return "🤖 I didn't understand your question. Try asking:\n\n" +
           "📦 **Inventory Management:**\n" +
           "• 'Which products are running low?' or 'low stock'\n" +
           "• 'What's my inventory worth?' or 'inv val'\n\n" +
           "📈 **Sales Analytics:**\n" +
           "• 'What are my top-selling products?' or 'top prods'\n" +
           "• 'How much did I sell today?' or 'sales today'\n" +
           "• 'Sales this month' or 'sales month'\n\n" +
           "💡 Or click 'Show Suggestions' for more questions!";
  };

  const handleLowStock = async (): Promise<string> => {
    const { data } = await supabase
      .from('products')
      .select('name, current_stock, min_stock_threshold, category')
      .eq('is_active', true);

    if (!data) return 'Could not get data.';
    
    const lowStock = data.filter(p => p.current_stock <= p.min_stock_threshold);
    
    if (lowStock.length === 0) {
      const celebrations = [
        '✅ **Amazing!** All products are well-stocked! You\'re a inventory wizard! 🧙‍♂️✨',
        '🎯 **Perfect!** No low stock alerts - your planning game is strong! 💪🔥',
        '🏆 **Excellent!** Every product is properly stocked! You\'re crushing it! 🚀',
        '⭐ **Fantastic!** Zero low stock issues - that\'s professional management! 👑'
      ];
      
      return celebrations[Math.floor(Math.random() * celebrations.length)];
    }
    
    const urgentCount = lowStock.filter(p => p.current_stock <= 5).length;
    let intro = '';
    
    if (urgentCount > 5) {
      intro = `🚨 **RED ALERT!** Found ${lowStock.length} products running low (${urgentCount} critically low!):`;
    } else if (lowStock.length > 10) {
      intro = `⚠️ **Attention needed!** Found ${lowStock.length} products that need restocking:`;
    } else {
      intro = `📋 **Heads up!** Found ${lowStock.length} products running low:`;
    }
    
    let result = `${intro}\n\n`;
    lowStock.slice(0, 10).forEach(p => {
      const urgency = p.current_stock <= 5 ? '🔴' : p.current_stock <= 15 ? '🟡' : '🟠';
      result += `${urgency} **${p.name}**: ${p.current_stock} units left\n`;
    });
    
    const actionMsg = urgentCount > 0 ? 
      '\n🚀 **URGENT ACTION NEEDED!** Some items are critically low - restock ASAP!' :
      '\n💡 **Time to restock!** Keep your inventory flowing smoothly! 📦✨';
    
    return result + actionMsg;
  };

  const handleTopProducts = async (): Promise<string> => {
    const { data: salesData } = await supabase
      .from('sales')
      .select('product_id, quantity, total_amount')
      .eq('status', 'completed');

    if (!salesData || salesData.length === 0) {
      return 'No sales data available for top products.';
    }

    const { data: products } = await supabase
      .from('products')
      .select('id, name, category');

    if (!products) {
      return 'Could not get product data.';
    }

    const productMap = products.reduce((acc, p) => {
      acc[p.id] = { name: p.name, category: p.category };
      return acc;
    }, {} as Record<string, { name: string; category: string }>);

    const aggregated = salesData.reduce((acc, sale) => {
      const product = productMap[sale.product_id];
      if (!product) return acc;
      const name = product.name;
      if (!acc[name]) acc[name] = { quantity: 0, revenue: 0, category: product.category };
      acc[name].quantity += sale.quantity;
      acc[name].revenue += sale.total_amount;
      return acc;
    }, {} as Record<string, { quantity: number; revenue: number; category: string }>);

    const sorted = Object.entries(aggregated)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5);

    if (sorted.length === 0) {
      return 'No sales data available yet.';
    }

    let result = '🏆 **Top 5 Best-Selling Products:**\n\n';
      
    sorted.forEach(([name, data], index) => {
      const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index];
      result += `${medal} **${name}** (${data.category})\n`;
      result += `   📦 ${data.quantity} units sold\n`;
      result += `   💰 ₱${data.revenue.toLocaleString()} revenue\n\n`;
    });
    
    return result;
  };

  const handleTodaySales = async (): Promise<string> => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('sales')
      .select('total_amount, quantity')
      .eq('status', 'completed')
      .gte('created_at', today);

    const total = (data || []).reduce((sum, s) => sum + s.total_amount, 0);
    const units = (data || []).reduce((sum, s) => sum + s.quantity, 0);
    const transactions = data?.length || 0;
    
    if (total === 0) {
      return '🌱 **Today\'s a fresh start!** No sales yet, but every empire starts with the first sale! 🚀\n\n💪 Keep hustling - your breakthrough moment is coming!';
    }
    
    const encouragements = [
      '🎆 **Today\'s sales are looking fantastic!**',
      '💰 **Cha-ching! Today\'s money moves:**',
      '🚀 **Your sales rocket is flying high today!**',
      '🏆 **Winning day vibes! Today\'s performance:**',
      '✨ **Magic is happening! Today\'s sales sparkle:**'
    ];
    
    const intro = encouragements[Math.floor(Math.random() * encouragements.length)];
    
    let performance = '';
    if (total > 50000) performance = '\n\n🔥 **INCREDIBLE!** You\'re absolutely crushing it today! 💪';
    else if (total > 20000) performance = '\n\n🎉 **AWESOME!** That\'s some solid business right there! 😎';
    else if (total > 10000) performance = '\n\n🚀 **GREAT JOB!** You\'re building momentum! 💪';
    else performance = '\n\n🌱 **NICE START!** Every sale counts towards your success! ✨';
    
    return `${intro}\n\n💰 Revenue: ₱${total.toLocaleString()}\n📦 Units Sold: ${units}\n🛒 Transactions: ${transactions}${performance}`;
  };

  const handleInventoryValue = async (): Promise<string> => {
    const { data } = await supabase
      .from('products')
      .select('current_stock, unit_price')
      .eq('is_active', true);

    if (!data) return 'Could not get data.';
    
    const totalValue = data.reduce((sum, p) => sum + (p.current_stock * p.unit_price), 0);
    
    const funnyIntros = [
      '💎 **Wow! Your inventory is worth a fortune:**',
      '🏦 **Drumroll please... Your inventory treasure:**',
      '💰 **Ka-ching! Your stock portfolio value:**',
      '🎯 **Impressive! Your business assets total:**',
      '💸 **Holy moly! Your inventory goldmine:**'
    ];
    
    const intro = funnyIntros[Math.floor(Math.random() * funnyIntros.length)];
    
    return `${intro}\n\n₱${totalValue.toLocaleString()}\n\n📦 Across ${data.length} amazing products!\n\n💡 That's some serious business value you've built! 🚀`;
  };

  const handleCustomers = async (): Promise<string> => {
    const { data } = await supabase
      .from('customers')
      .select('name, total_purchases')
      .order('total_purchases', { ascending: false })
      .limit(5);

    if (!data || data.length === 0) {
      return '📋 **Customer Analysis: No Data Available**\n\nI couldn\'t find any customer purchase data yet. This might mean:\n\n• You\'re just starting out (that\'s exciting!)\n• Sales haven\'t been recorded with customer info\n• Customer data needs to be set up\n\n💡 **Get started:**\n• Begin tracking customer information with each sale\n• Implement a simple customer loyalty program\n• Ask for contact details to build your customer base';
    }
    
    const totalCustomers = data.length;
    const totalSpent = data.reduce((sum, c) => sum + c.total_purchases, 0);
    const avgSpending = totalSpent / totalCustomers;
    const topCustomer = data[0];
    const loyaltyGap = topCustomer.total_purchases - (data[1]?.total_purchases || 0);
    
    let result = `🏆 **Customer Value Analysis**\n\nI've analyzed your customer base and identified your most valuable relationships:\n\n`;
    
    result += `📋 **Customer Insights:**\n`;
    result += `• Total VIP Customers: ${totalCustomers}\n`;
    result += `• Combined Value: ₱${totalSpent.toLocaleString()}\n`;
    result += `• Average Spending: ₱${avgSpending.toLocaleString()}\n\n`;
    
    result += `🎆 **Top 5 Customers by Value:**\n`;
    data.forEach((customer, index) => {
      const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index];
      const percentage = ((customer.total_purchases / totalSpent) * 100).toFixed(1);
      result += `${medal} **${customer.name}**: ₱${customer.total_purchases.toLocaleString()} (${percentage}%)\n`;
    });
    
    result += '\n🤖 **AI Customer Strategy:**\n';
    if (loyaltyGap > avgSpending) {
      result += `• ${topCustomer.name} is your star customer - consider VIP perks\n`;
    }
    result += '• Focus retention efforts on these high-value customers\n';
    result += '• Create personalized offers based on purchase history\n';
    result += '• Ask top customers for referrals to grow similar segments\n';
    result += '• Study buying patterns to predict future needs';
    
    return result;
  };

  const handleAlerts = async (): Promise<string> => {
    const { data } = await supabase
      .from('alerts')
      .select('message, severity, created_at')
      .eq('is_resolved', false)
      .order('severity', { ascending: false })
      .order('created_at', { ascending: false });

    if (!data || data.length === 0) {
      return '✅ **Alert Status: All Clear!**\n\n' +
             'Great news! I\'ve scanned your entire system and found no active alerts. Your business is running smoothly:\n\n' +
             '🎯 **What this means:**\n' +
             '• All products are properly stocked\n' +
             '• No critical issues detected\n' +
             '• Systems are operating normally\n\n' +
             '💡 **Stay proactive:**\n' +
             '• Continue monitoring stock levels daily\n' +
             '• Set up automated restock alerts\n' +
             '• Review performance metrics regularly';
    }
    
    const criticalCount = data.filter(a => a.severity === 'critical').length;
    const highCount = data.filter(a => a.severity === 'high').length;
    const mediumCount = data.filter(a => a.severity === 'medium').length;
    
    let result = `🚨 **Alert Analysis: ${data.length} Active Issues**\n\nI've identified several issues that need your attention. Here's my priority assessment:\n\n`;
    
    if (criticalCount > 0) {
      result += `🔴 **CRITICAL (${criticalCount})** - Immediate action required\n`;
    }
    if (highCount > 0) {
      result += `🟠 **HIGH (${highCount})** - Address within 24 hours\n`;
    }
    if (mediumCount > 0) {
      result += `🟡 **MEDIUM (${mediumCount})** - Monitor and plan resolution\n`;
    }
    
    result += '\n📋 **Top Priority Alerts:**\n';
    data.slice(0, 5).forEach((alert, index) => {
      const icon = alert.severity === 'critical' ? '🔴' : alert.severity === 'high' ? '🟠' : '🟡';
      result += `${icon} ${alert.message}\n`;
    });
    
    result += '\n🤖 **AI Recommendations:**\n';
    if (criticalCount > 0) {
      result += '• Address critical alerts immediately to prevent business disruption\n';
    }
    result += '• Set up automated notifications for faster response times\n';
    result += '• Review alert patterns to identify recurring issues\n';
    result += '• Consider preventive measures for common alert types';
    
    return result;
  };

  const handleCategoryBreakdown = async (): Promise<string> => {
    const { data } = await supabase
      .from('products')
      .select('category, current_stock, unit_price')
      .eq('is_active', true);

    if (!data) return 'I couldn\'t access your product data right now. Please try again.';
    
    const byCategory = data.reduce((acc, p) => {
      if (!acc[p.category]) acc[p.category] = { count: 0, stock: 0, value: 0 };
      acc[p.category].count++;
      acc[p.category].stock += p.current_stock;
      acc[p.category].value += p.current_stock * p.unit_price;
      return acc;
    }, {} as Record<string, { count: number; stock: number; value: number }>);

    const totalProducts = Object.values(byCategory).reduce((sum, cat) => sum + cat.count, 0);
    const totalValue = Object.values(byCategory).reduce((sum, cat) => sum + cat.value, 0);
    
    let result = `📊 **Product Distribution Analysis**\n\nI've analyzed your ${totalProducts} products across ${Object.keys(byCategory).length} categories. Here's what I found:\n\n`;
    
    const sortedCategories = Object.entries(byCategory).sort((a, b) => b[1].value - a[1].value);
    
    sortedCategories.forEach(([category, stats], index) => {
      const percentage = ((stats.value / totalValue) * 100).toFixed(1);
      const emoji = index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📦';
      result += `${emoji} **${category}**: ${stats.count} products (${stats.stock} units)\n`;
      result += `   💰 Value: ₱${stats.value.toLocaleString()} (${percentage}% of total)\n\n`;
    });
    
    const topCategory = sortedCategories[0];
    result += `💡 **AI Insights:**\n`;
    result += `• ${topCategory[0]} is your most valuable category (${((topCategory[1].value / totalValue) * 100).toFixed(1)}% of inventory value)\n`;
    result += `• Consider focusing marketing efforts on high-value categories\n`;
    result += `• Monitor stock levels in top-performing categories closely`;
    
    return result;
  };

  const handleAverageOrder = async (): Promise<string> => {
    const { data } = await supabase
      .from('sales')
      .select('total_amount')
      .eq('status', 'completed');

    if (!data || data.length === 0) {
      return 'No sales data available to calculate average order value.';
    }
    
    const total = data.reduce((sum, s) => sum + s.total_amount, 0);
    const avg = total / data.length;
    
    return `📊 **Average Order Value:**\n\n💰 ₱${avg.toFixed(2)}\n\n📈 Based on ${data.length} transactions\n💵 Total revenue: ₱${total.toLocaleString()}`;
  };

  const handleSuppliers = async (): Promise<string> => {
    const { data } = await supabase
      .from('suppliers')
      .select('name, rating, lead_time_days')
      .eq('is_active', true)
      .order('rating', { ascending: false });

    if (!data || data.length === 0) {
      return 'No supplier data available.';
    }
    
    let result = '⭐ **Supplier Ratings (highest first):**\n\n';
    data.slice(0, 5).forEach((supplier, index) => {
      const stars = '⭐'.repeat(Math.floor(supplier.rating));
      result += `${index + 1}. **${supplier.name}**\n   ${stars} ${supplier.rating}/5.0\n   🚚 ${supplier.lead_time_days} days lead time\n\n`;
    });
    
    return result;
  };

  const handleZeroStock = async (): Promise<string> => {
    const { data } = await supabase
      .from('products')
      .select('name, category')
      .eq('current_stock', 0)
      .eq('is_active', true);

    if (!data || data.length === 0) {
      const celebrations = [
        '✅ **Fantastic news!** No products are completely out of stock! 🎉',
        '🎆 **Excellent inventory management!** Zero stockouts detected! 😎',
        '🏆 **You\'re crushing it!** All products have stock available! 💪',
        '✨ **Perfect stock control!** No empty shelves here! 🚀',
        '🎯 **Bullseye!** Your inventory game is on point - no stockouts! 🔥'
      ];
      
      return celebrations[Math.floor(Math.random() * celebrations.length)];
    }
    
    let result = `🚨 Uh oh! ${data.length} products decided to go on vacation (zero stock):\n\n`;
    data.forEach(p => {
      result += `• ${p.name} (${p.category}) - 🏠 Gone fishing!\n`;
    });
    return result + '\n⚠️ Time for an emergency restock mission! 🚑💼';
  };

  const handleWeeklySales = async (): Promise<string> => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    
    const { data } = await supabase
      .from('sales')
      .select('total_amount, quantity, created_at')
      .eq('status', 'completed')
      .gte('created_at', weekStart.toISOString());

    const total = (data || []).reduce((sum, s) => sum + s.total_amount, 0);
    const units = (data || []).reduce((sum, s) => sum + s.quantity, 0);
    const transactions = data?.length || 0;
    const avgDaily = transactions / 7;
    
    return `📈 **Weekly Sales Report:**\n\n💰 Revenue: ₱${total.toLocaleString()}\n📦 Units Sold: ${units}\n🛒 Transactions: ${transactions}\n📊 Average daily: ${avgDaily.toFixed(1)} transactions`;
  };

  const handleMonthlySales = async (): Promise<string> => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    
    const { data } = await supabase
      .from('sales')
      .select('total_amount, quantity, created_at')
      .eq('status', 'completed')
      .gte('created_at', monthStart.toISOString());

    const total = (data || []).reduce((sum, s) => sum + s.total_amount, 0);
    const units = (data || []).reduce((sum, s) => sum + s.quantity, 0);
    const transactions = data?.length || 0;
    const daysInMonth = new Date().getDate();
    const avgDaily = total / daysInMonth;
    
    return `📈 **This Month's Sales Performance:**\n\n💰 Revenue: ₱${total.toLocaleString()}\n📦 Units Sold: ${units}\n🛒 Transactions: ${transactions}\n📊 Average daily: ₱${avgDaily.toFixed(2)}`;
  };

  const handleTodayTransactions = async (): Promise<string> => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('sales')
      .select('id, total_amount, quantity, created_at')
      .eq('status', 'completed')
      .gte('created_at', today);

    const count = data?.length || 0;
    const total = (data || []).reduce((sum, s) => sum + s.total_amount, 0);
    const units = (data || []).reduce((sum, s) => sum + s.quantity, 0);
    
    return `📊 **Today's Transactions:**\n\n🛒 Count: ${count} transactions\n💰 Revenue: ₱${total.toLocaleString()}\n📦 Units Sold: ${units}`;
  };

  const handleProductBrowse = async (): Promise<string> => {
    const { data: products } = await supabase
      .from('products')
      .select('name, current_stock, category, unit_price')
      .eq('is_active', true)
      .order('category')
      .limit(20);

    if (!products || products.length === 0) {
      return 'No products found in inventory.';
    }

    const byCategory = products.reduce((acc, p) => {
      if (!acc[p.category]) acc[p.category] = [];
      acc[p.category].push(p);
      return acc;
    }, {} as Record<string, typeof products>);

    let result = '🔍 **Product Browse by Category:**\n\n';
    
    Object.entries(byCategory).forEach(([category, items]) => {
      result += `📦 **${category}** (${items.length} items):\n`;
      items.slice(0, 5).forEach(p => {
        const status = p.current_stock <= 5 ? '⚠️' : p.current_stock <= 20 ? '🟡' : '✅';
        result += `  ${status} ${p.name}: ${p.current_stock} units (₱${p.unit_price})\n`;
      });
      if (items.length > 5) {
        result += `  ... and ${items.length - 5} more\n`;
      }
      result += '\n';
    });
    
    result += '💡 **Search Tips:**\n';
    result += '• Ask "Find rice" to search for specific products\n';
    result += '• Ask "Show me all beverages" for category search\n';
    result += '• Ask "Which products are low on stock?" for alerts';
    
    return result;
  };

  const handleSalesForecast = async (): Promise<string> => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const { data: salesData } = await supabase
      .from('sales')
      .select('total_amount, quantity, created_at')
      .eq('status', 'completed')
      .gte('created_at', threeMonthsAgo.toISOString());

    if (!salesData || salesData.length === 0) {
      return '📊 **Sales Forecast:**\n\nNot enough historical data for accurate forecasting.';
    }

    const monthlyData = salesData.reduce((acc, sale) => {
      const month = new Date(sale.created_at).getMonth();
      if (!acc[month]) acc[month] = { revenue: 0, units: 0, transactions: 0 };
      acc[month].revenue += sale.total_amount;
      acc[month].units += sale.quantity;
      acc[month].transactions += 1;
      return acc;
    }, {} as Record<number, { revenue: number; units: number; transactions: number }>);

    const months = Object.keys(monthlyData).length;
    const avgRevenue = Object.values(monthlyData).reduce((sum, m) => sum + m.revenue, 0) / months;
    const avgUnits = Object.values(monthlyData).reduce((sum, m) => sum + m.units, 0) / months;

    const recentMonth = Math.max(...Object.keys(monthlyData).map(Number));
    const oldestMonth = Math.min(...Object.keys(monthlyData).map(Number));
    const growthRate = months > 1 ? 
      ((monthlyData[recentMonth].revenue - monthlyData[oldestMonth].revenue) / monthlyData[oldestMonth].revenue) * 100 : 0;

    const forecastRevenue = avgRevenue * (1 + (growthRate / 100));
    const confidence = months >= 3 ? 'High' : 'Medium';
    
    return `📊 **Sales Forecast for Next Month:**\n\n` +
           `💰 Predicted Revenue: ₱${forecastRevenue.toFixed(0).toLocaleString()}\n` +
           `📈 Growth Rate: ${growthRate > 0 ? '+' : ''}${growthRate.toFixed(1)}%\n` +
           `🎯 Confidence: ${confidence}\n\n` +
           `💡 Based on ${months} months of data`;
  };

  const handleOrderRecommendations = async (): Promise<string> => {
    const { data: products } = await supabase
      .from('products')
      .select('name, current_stock, min_stock_threshold, reorder_quantity, category')
      .eq('is_active', true);

    if (!products) return 'Could not get product data.';

    const lowStock = products.filter(p => p.current_stock <= p.min_stock_threshold);
    
    if (lowStock.length === 0) {
      const celebrations = [
        '✅ **You\'re all set!** No restocking needed - your inventory is perfectly balanced! 🎯✨',
        '🏆 **Inventory champion!** All products are well-stocked! Time to focus on sales! 🚀',
        '🎉 **Perfect planning!** No urgent orders needed - you\'re ahead of the game! 💪'
      ];
      
      return celebrations[Math.floor(Math.random() * celebrations.length)];
    }

    const totalOrderValue = lowStock.reduce((sum, p) => sum + (p.reorder_quantity * (p.unit_price || 0)), 0);
    const criticalCount = lowStock.filter(p => p.current_stock === 0).length;
    
    let intro = '';
    if (criticalCount > 0) {
      intro = `🚨 **URGENT RESTOCK MISSION!** ${criticalCount} items are completely out! Here\'s your action plan:`;
    } else {
      intro = `📋 **Smart Restock Strategy!** Time to replenish ${lowStock.length} products before they run out:`;
    }

    let result = `${intro}\n\n`;
    
    lowStock.slice(0, 8).forEach(product => {
      const urgency = product.current_stock === 0 ? '🔴' : product.current_stock <= 5 ? '🟡' : '🟠';
      result += `${urgency} **${product.name}** (${product.category})\n`;
      result += `   📋 Current: ${product.current_stock} units\n`;
      result += `   📦 Recommended: ${product.reorder_quantity} units\n\n`;
    });

    const motivation = criticalCount > 0 ? 
      '🚀 **ACT FAST!** Some items are sold out - restock immediately to avoid lost sales!' :
      '💡 **Stay ahead!** Order these now to maintain smooth operations! 🎯';

    return result + motivation;
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    setShowSuggestions(false);

    try {
      const response = await processQuery(userMessage);

      const { data } = await supabase
        .from('chat_history')
        .insert([{
          user_id: user?.id,
          message: userMessage,
          response,
          context_data: {}
        }])
        .select()
        .single();

      if (data) {
        setMessages([...messages, data]);
      }
    } catch (error) {
      console.error('Error processing chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (question: string) => {
    setInput(question);
    setShowSuggestions(false);
  };

  return (
    <div className="p-4 lg:p-8 h-full flex flex-col">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 lg:mb-6 gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">AI Assistant</h1>
          <p className="text-gray-400">Ask questions about your inventory, sales, and business data</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all text-sm"
          >
            <Lightbulb className="w-4 h-4" />
            {showSuggestions ? 'Hide' : 'Show'} Suggestions
          </button>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Clear Chat
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
          {messages.length === 0 && !showSuggestions ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-4 rounded-2xl inline-block mb-4">
                  <Bot className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-white text-xl font-semibold mb-2">Ready to Help!</h3>
                <p className="text-gray-400 mb-6">
                  I'm connected to your real business data. Start typing or click "Show Suggestions" to see what I can help with!
                </p>
              </div>
            </div>
          ) : showSuggestions ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-4 rounded-2xl inline-block mb-4">
                  <Bot className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-white text-xl font-semibold mb-2">What would you like to know?</h3>
                <p className="text-gray-400 mb-6">Click any question below or type your own!</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
                {SUGGESTED_QUESTIONS.map((question, index) => {
                  const IconComponent = question.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(question.text)}
                      className="group p-3 lg:p-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-blue-500 rounded-lg transition-all text-left"
                    >
                      <div className="flex items-start gap-3">
                        <div className="bg-blue-600/10 p-2 rounded-lg group-hover:bg-blue-600/20 transition-all flex-shrink-0">
                          <IconComponent className="w-4 lg:w-5 h-4 lg:h-5 text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium group-hover:text-blue-300 transition-all text-sm lg:text-base">
                            {question.text}
                          </p>
                          <p className="text-gray-500 text-xs lg:text-sm mt-1">{question.category}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-600 p-2 rounded-lg flex-shrink-0">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 bg-gray-800 rounded-lg p-4">
                      <p className="text-white">{msg.message}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-2 rounded-lg flex-shrink-0">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <p className="text-gray-200 whitespace-pre-line">{msg.response}</p>
                      <p className="text-gray-500 text-xs mt-2">
                        Based on real-time data from your system
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-start gap-3">
                  <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-2 rounded-lg flex-shrink-0">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Loader className="w-4 h-4 text-gray-400 animate-spin" />
                      <p className="text-gray-400">Analyzing your data...</p>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="border-t border-gray-800 p-3 lg:p-4">
          <div className="flex items-center gap-2 lg:gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about your inventory, sales, or business data..."
              disabled={loading}
              className="flex-1 px-3 lg:px-4 py-2.5 lg:py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50 text-sm lg:text-base"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-4 lg:px-6 py-2.5 lg:py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm lg:text-base"
            >
              <Send className="w-4 lg:w-5 h-4 lg:h-5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}