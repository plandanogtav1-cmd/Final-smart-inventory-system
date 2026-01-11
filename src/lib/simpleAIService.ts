// Simple AI Service using your existing server
import { supabase } from './supabase';

interface BusinessContext {
  products: any[];
  sales: any[];
  customers: any[];
  suppliers: any[];
  alerts: any[];
  returns?: any[];
}

export class SimpleAIService {
  /**
   * Get business context data for AI processing
   */
  private static async getBusinessContext(userId: string): Promise<BusinessContext> {
    try {
      const [products, sales, customers, suppliers, alerts, returns] = await Promise.all([
        supabase.from('products').select('*').eq('is_active', true).limit(50),
        supabase.from('sales').select('*').eq('status', 'completed').order('created_at', { ascending: false }).limit(100),
        supabase.from('customers').select('*').order('total_purchases', { ascending: false }).limit(20),
        supabase.from('suppliers').select('*').eq('is_active', true),
        supabase.from('alerts').select('*').eq('is_resolved', false).limit(10),
        supabase.from('returns').select('*').order('created_at', { ascending: false }).limit(50)
      ]);

      return {
        products: products.data || [],
        sales: sales.data || [],
        customers: customers.data || [],
        suppliers: suppliers.data || [],
        alerts: alerts.data || [],
        returns: returns.data || []
      };
    } catch (error) {
      console.error('Error fetching business context:', error);
      return { products: [], sales: [], customers: [], suppliers: [], alerts: [], returns: [] };
    }
  }

  /**
   * Generate business summary for AI context
   */
  private static generateBusinessSummary(context: BusinessContext): string {
    const { products, sales, customers, suppliers, alerts } = context;
    
    // Products analysis
    const totalProducts = products.length;
    const lowStockProducts = products.filter(p => p.current_stock <= p.min_stock_threshold);
    const outOfStockProducts = products.filter(p => p.current_stock === 0);
    const totalInventoryValue = products.reduce((sum, p) => sum + (p.current_stock * p.unit_price), 0);
    
    // Sales analysis
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, s) => sum + s.total_amount, 0);
    const todaySales = sales.filter(s => {
      const saleDate = new Date(s.created_at).toDateString();
      const today = new Date().toDateString();
      return saleDate === today;
    });
    const todayGrossRevenue = todaySales.reduce((sum, s) => sum + s.total_amount, 0);
    
    // Get today's returns to calculate net revenue
    const todayReturns = context.returns?.filter(r => {
      const returnDate = new Date(r.created_at).toDateString();
      const today = new Date().toDateString();
      return returnDate === today;
    }) || [];
    const todayReturnAmount = todayReturns.reduce((sum, r) => sum + r.total_amount, 0);
    const todayRevenue = Math.max(0, todayGrossRevenue - todayReturnAmount);
    
    // Top products
    const productSales = sales.reduce((acc, sale) => {
      const productId = sale.product_id;
      if (!acc[productId]) acc[productId] = { quantity: 0, revenue: 0 };
      acc[productId].quantity += sale.quantity;
      acc[productId].revenue += sale.total_amount;
      return acc;
    }, {} as Record<string, { quantity: number; revenue: number }>);
    
    const topProducts = Object.entries(productSales)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5)
      .map(([productId, data]) => {
        const product = products.find(p => p.id === productId);
        return product ? `${product.name}: ₱${data.revenue.toLocaleString()} revenue, ${data.quantity} units sold` : '';
      })
      .filter(Boolean);

    return `BUSINESS DATA:
Total Products: ${totalProducts}
Low Stock: ${lowStockProducts.length} items
Out of Stock: ${outOfStockProducts.length} items  
Inventory Value: ₱${totalInventoryValue.toLocaleString()}
Total Sales: ${totalSales} transactions
Total Revenue: ₱${totalRevenue.toLocaleString()}
Today's Sales: ${todaySales.length} transactions, ₱${todayRevenue.toLocaleString()}
Top Products: ${topProducts.slice(0, 3).join(', ')}
Customers: ${customers.length}
Suppliers: ${suppliers.length}
Active Alerts: ${alerts.length}`;
  }

  /**
   * Query AI directly via Gemini API
   */
  static async queryWithAI(userQuery: string, userId: string): Promise<string> {
    try {
      console.log('🤖 Calling Gemini AI with query:', userQuery);
      
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API key not found');
      }
      
      // Get business context
      const context = await this.getBusinessContext(userId);
      const businessSummary = this.generateBusinessSummary(context);
      
      // Create AI prompt with business context
      const prompt = `Business Assistant for Inventory System.

Data:
${businessSummary}

Q: "${userQuery}"

Provide concise, actionable insights with key metrics. Use emojis. Max 3 sentences.`;

      console.log('📝 Calling Gemini API...');

      // Call Gemini API directly
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });

      console.log('📡 Gemini Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Gemini Error:', response.status, errorText);
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const result = await response.json();
      console.log('📊 Gemini Result:', result);
      
      if (result?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const aiResponse = result.candidates[0].content.parts[0].text;
        console.log('✨ AI Response:', aiResponse);
        return aiResponse;
      } else {
        throw new Error('No valid response from Gemini');
      }

    } catch (error) {
      console.error('❌ AI Service error:', error);
      throw error;
    }
  }

  /**
   * Check if AI is available
   */
  static isAvailable(): boolean {
    return !!import.meta.env.VITE_GEMINI_API_KEY;
  }
}