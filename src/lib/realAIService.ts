// Real AI Service using Google Gemini (Free & Cloud-based)
import { supabase } from './supabase';

interface BusinessContext {
  products: any[];
  sales: any[];
  customers: any[];
  suppliers: any[];
  alerts: any[];
}

export class RealAIService {
  private static readonly GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
  private static readonly API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

  /**
   * Get business context data for AI processing
   */
  private static async getBusinessContext(userId: string): Promise<BusinessContext> {
    try {
      const [products, sales, customers, suppliers, alerts] = await Promise.all([
        supabase.from('products').select('*').eq('is_active', true).limit(50),
        supabase.from('sales').select('*').eq('status', 'completed').order('created_at', { ascending: false }).limit(100),
        supabase.from('customers').select('*').order('total_purchases', { ascending: false }).limit(20),
        supabase.from('suppliers').select('*').eq('is_active', true),
        supabase.from('alerts').select('*').eq('is_resolved', false).limit(10)
      ]);

      return {
        products: products.data || [],
        sales: sales.data || [],
        customers: customers.data || [],
        suppliers: suppliers.data || [],
        alerts: alerts.data || []
      };
    } catch (error) {
      console.error('Error fetching business context:', error);
      return { products: [], sales: [], customers: [], suppliers: [], alerts: [] };
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
    const todayRevenue = todaySales.reduce((sum, s) => sum + s.total_amount, 0);
    
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

    return `BUSINESS DATA SUMMARY:

INVENTORY:
- Total Products: ${totalProducts}
- Low Stock Items: ${lowStockProducts.length}
- Out of Stock Items: ${outOfStockProducts.length}
- Total Inventory Value: ₱${totalInventoryValue.toLocaleString()}

SALES PERFORMANCE:
- Total Sales Transactions: ${totalSales}
- Total Revenue: ₱${totalRevenue.toLocaleString()}
- Today's Sales: ${todaySales.length} transactions, ₱${todayRevenue.toLocaleString()} revenue

TOP PERFORMING PRODUCTS:
${topProducts.join('\n')}

CUSTOMERS: ${customers.length} total customers
SUPPLIERS: ${suppliers.length} active suppliers
ACTIVE ALERTS: ${alerts.length} unresolved issues

Current date: ${new Date().toLocaleDateString()}`;
  }

  /**
   * Query Google Gemini AI with business context
   */
  static async queryWithRealAI(userQuery: string, userId: string): Promise<string> {
    try {
      console.log('🤖 Calling Google Gemini AI with query:', userQuery);
      
      // Get business context
      const context = await this.getBusinessContext(userId);
      
      // Check if we have API key
      if (!this.API_KEY) {
        console.warn('❌ Gemini API key not found');
        throw new Error('No API key');
      }

      console.log('✅ API Key found, creating context prompt...');
      
      // Create AI prompt with business context
      const businessSummary = this.generateBusinessSummary(context);
      const prompt = `You are an intelligent business assistant for an inventory management system. You have access to real-time business data and should provide helpful, accurate insights.

${businessSummary}

User Question: "${userQuery}"

Instructions:
- Analyze the business data provided above
- Give specific, actionable insights based on the actual numbers
- Be conversational and helpful
- Include relevant data points in your response
- Provide strategic recommendations when appropriate
- Use emojis to make responses engaging
- Keep responses concise but informative

Response:`;

      console.log('📝 Prompt created, calling Gemini API...');

      // Query Google Gemini API
      const response = await fetch(`${this.GEMINI_API_URL}?key=${this.API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 500,
          }
        })
      });

      console.log('📡 API Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('📊 API Result:', result);
      
      if (result && result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts[0]) {
        let aiResponse = result.candidates[0].content.parts[0].text.trim();
        
        console.log('✨ Real AI Response:', aiResponse);
        return aiResponse;
      } else {
        console.warn('⚠️ No valid response from AI model');
        throw new Error('No valid response from AI model');
      }

    } catch (error) {
      console.error('❌ Gemini AI error:', error);
      throw error; // Let the calling function handle fallback
    }
  }

  /**
   * Check if real AI is available
   */
  static isAvailable(): boolean {
    return !!this.API_KEY;
  }
}