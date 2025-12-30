// inventory-data.js - Backend API for chatbot database access

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Use service key for backend
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body;

  try {
    // Analyze query and fetch relevant data
    const data = await getInventoryData(query);
    res.json({ data, success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getInventoryData(query) {
  const lowerQuery = query.toLowerCase();
  
  // Stock levels and alerts
  if (lowerQuery.includes('low stock') || lowerQuery.includes('running low')) {
    const { data } = await supabase
      .from('products')
      .select('name, current_stock, min_stock_threshold')
      .lt('current_stock', supabase.raw('min_stock_threshold'));
    return { type: 'low_stock', products: data };
  }

  // Sales data
  if (lowerQuery.includes('sales') || lowerQuery.includes('sold')) {
    const { data } = await supabase
      .from('sales')
      .select(`
        quantity, total_amount, sale_date,
        products(name)
      `)
      .gte('sale_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('sale_date', { ascending: false });
    return { type: 'sales', sales: data };
  }

  // Inventory value
  if (lowerQuery.includes('inventory value') || lowerQuery.includes('worth')) {
    const { data } = await supabase
      .from('products')
      .select('current_stock, unit_price');
    const totalValue = data.reduce((sum, p) => sum + (p.current_stock * p.unit_price), 0);
    return { type: 'inventory_value', value: totalValue, products: data.length };
  }

  // Top products
  if (lowerQuery.includes('top') || lowerQuery.includes('best')) {
    const { data } = await supabase
      .from('sales')
      .select(`
        product_id, quantity,
        products(name)
      `)
      .gte('sale_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    
    const productSales = {};
    data.forEach(sale => {
      const productName = sale.products.name;
      productSales[productName] = (productSales[productName] || 0) + sale.quantity;
    });
    
    const topProducts = Object.entries(productSales)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    return { type: 'top_products', products: topProducts };
  }

  // Default: return general stats
  const [products, sales, alerts] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact' }),
    supabase.from('sales').select('total_amount').gte('sale_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from('alerts').select('*', { count: 'exact' }).eq('is_resolved', false)
  ]);

  return {
    type: 'general_stats',
    total_products: products.count,
    weekly_sales: sales.data.reduce((sum, s) => sum + s.total_amount, 0),
    active_alerts: alerts.count
  };
}