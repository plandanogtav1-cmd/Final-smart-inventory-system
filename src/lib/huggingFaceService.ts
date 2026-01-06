// Hugging Face AI Service for Enhanced Chatbot
import { supabase } from './supabase';

interface HuggingFaceResponse {
  generated_text?: string;
  error?: string;
}

interface BusinessContext {
  products: any[];
  sales: any[];
  customers: any[];
  suppliers: any[];
  alerts: any[];
}

export class HuggingFaceService {
  private static readonly HF_API_URL = 'https://api-inference.huggingface.co/models';
  private static readonly MODEL = 'microsoft/DialoGPT-medium'; // Free conversational AI model
  
  // Get your free API key from https://huggingface.co/settings/tokens
  private static readonly API_KEY = import.meta.env.VITE_HUGGING_FACE_API_KEY || '';

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
   * Create context-aware prompt for the AI model
   */
  private static createContextPrompt(query: string, context: BusinessContext): string {
    const businessSummary = this.generateBusinessSummary(context);
    
    return `You are a helpful business assistant for an inventory management system.

Business Data:
${businessSummary}

User asks: "${query}"

Provide a helpful response based on the data above. Be specific and actionable.`;
  }

  /**
   * Generate business summary for AI context
   */
  private static generateBusinessSummary(context: BusinessContext): string {
    const { products, sales, customers, suppliers, alerts } = context;
    
    let summary = `BUSINESS OVERVIEW:\n`;
    
    // Products summary
    const totalProducts = products.length;
    const lowStockProducts = products.filter(p => p.current_stock <= p.min_stock_threshold);
    const outOfStockProducts = products.filter(p => p.current_stock === 0);
    const totalInventoryValue = products.reduce((sum, p) => sum + (p.current_stock * p.unit_price), 0);
    
    summary += `- Total Products: ${totalProducts}\n`;
    summary += `- Low Stock Items: ${lowStockProducts.length}\n`;
    summary += `- Out of Stock Items: ${outOfStockProducts.length}\n`;
    summary += `- Total Inventory Value: ₱${totalInventoryValue.toLocaleString()}\n`;
    
    // Sales summary
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, s) => sum + s.total_amount, 0);
    const todaySales = sales.filter(s => {
      const saleDate = new Date(s.created_at).toDateString();
      const today = new Date().toDateString();
      return saleDate === today;
    });
    
    summary += `- Total Sales Transactions: ${totalSales}\n`;
    summary += `- Total Revenue: ₱${totalRevenue.toLocaleString()}\n`;
    summary += `- Today's Sales: ${todaySales.length} transactions\n`;
    
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
      .slice(0, 3)
      .map(([productId, data]) => {
        const product = products.find(p => p.id === productId);
        return product ? `${product.name} (₱${data.revenue.toLocaleString()})` : '';
      })
      .filter(Boolean);
    
    if (topProducts.length > 0) {
      summary += `- Top Products: ${topProducts.join(', ')}\n`;
    }
    
    // Customers summary
    summary += `- Total Customers: ${customers.length}\n`;
    if (customers.length > 0) {
      const topCustomer = customers[0];
      summary += `- Top Customer: ${topCustomer.name} (₱${topCustomer.total_purchases.toLocaleString()})\n`;
    }
    
    // Suppliers summary
    summary += `- Active Suppliers: ${suppliers.length}\n`;
    
    // Alerts summary
    if (alerts.length > 0) {
      summary += `- Active Alerts: ${alerts.length}\n`;
      const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
      if (criticalAlerts > 0) {
        summary += `- Critical Alerts: ${criticalAlerts}\n`;
      }
    }
    
    return summary;
  }

  /**
   * Query Hugging Face API with business context
   */
  static async queryWithContext(userQuery: string, userId: string): Promise<string> {
    try {
      console.log('🤖 Calling Hugging Face API with query:', userQuery);
      
      // Get business context
      const context = await this.getBusinessContext(userId);
      
      // Check if we have API key
      if (!this.API_KEY) {
        console.warn('❌ Hugging Face API key not found, falling back to rule-based responses');
        return this.fallbackResponse(userQuery, context);
      }

      console.log('✅ API Key found, creating context prompt...');
      
      // Create context-aware prompt
      const prompt = this.createContextPrompt(userQuery, context);
      console.log('📝 Prompt created, calling API via proxy...');

      // Query via your proxy server with business context
      const businessSummary = this.generateBusinessSummary(context);
      const response = await fetch('http://localhost:3001/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: userQuery,
          businessData: businessSummary
        })
      });

      console.log('📡 API Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Proxy Error:', response.status, errorData);
        throw new Error(`Proxy error! status: ${response.status} - ${errorData.error}`);
      }

      const proxyResult = await response.json();
      console.log('📊 Proxy Result:', proxyResult);
      
      if (proxyResult.success && proxyResult.result && proxyResult.result[0] && proxyResult.result[0].generated_text) {
        let aiResponse = proxyResult.result[0].generated_text.trim();
        
        // Clean up the response
        aiResponse = aiResponse.replace(prompt, '').trim();
        aiResponse = aiResponse.replace(/^Response:\s*/, '').trim();
        
        // Add emoji and formatting for better UX
        aiResponse = this.enhanceResponse(aiResponse);
        
        console.log('✨ Enhanced AI Response:', aiResponse);
        return aiResponse;
      } else {
        console.warn('⚠️ No valid response from AI model, using fallback');
        throw new Error('No valid response from AI model');
      }

    } catch (error) {
      console.error('❌ Hugging Face API error:', error);
      
      // Fallback to enhanced rule-based response
      const context = await this.getBusinessContext(userId);
      return this.fallbackResponse(userQuery, context);
    }
  }

  /**
   * Enhanced fallback response with business context
   */
  private static fallbackResponse(query: string, context: BusinessContext): string {
    const lowerQuery = query.toLowerCase();
    
    // Enhanced pattern matching with actual data
    if (lowerQuery.includes('low stock') || lowerQuery.includes('running low')) {
      const lowStock = context.products.filter(p => p.current_stock <= p.min_stock_threshold);
      if (lowStock.length === 0) {
        return '✅ **Great news!** All products are well-stocked! Your inventory management is on point! 🎯';
      }
      
      let response = `⚠️ **Found ${lowStock.length} products running low:**\n\n`;
      lowStock.slice(0, 5).forEach(p => {
        response += `• **${p.name}**: ${p.current_stock} units left\n`;
      });
      response += '\n💡 **AI Recommendation:** Consider restocking these items soon to avoid stockouts!';
      return response;
    }
    
    if (lowerQuery.includes('sales') && (lowerQuery.includes('today') || lowerQuery.includes('daily'))) {
      const today = new Date().toDateString();
      const todaySales = context.sales.filter(s => new Date(s.created_at).toDateString() === today);
      const todayRevenue = todaySales.reduce((sum, s) => sum + s.total_amount, 0);
      
      return `📊 **Today's Performance:**\n\n💰 Revenue: ₱${todayRevenue.toLocaleString()}\n🛒 Transactions: ${todaySales.length}\n\n${todayRevenue > 10000 ? '🚀 **Excellent performance today!**' : '🌱 **Building momentum - keep it up!**'}`;
    }
    
    if (lowerQuery.includes('top') && lowerQuery.includes('product')) {
      const productSales = context.sales.reduce((acc, sale) => {
        if (!acc[sale.product_id]) acc[sale.product_id] = 0;
        acc[sale.product_id] += sale.total_amount;
        return acc;
      }, {} as Record<string, number>);
      
      const topProducts = Object.entries(productSales)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([productId, revenue]) => {
          const product = context.products.find(p => p.id === productId);
          return product ? `• **${product.name}**: ₱${revenue.toLocaleString()}` : null;
        })
        .filter(Boolean);
      
      if (topProducts.length === 0) {
        return '📊 **No sales data available yet.** Start making sales to see your top performers!';
      }
      
      return `🏆 **Top Performing Products:**\n\n${topProducts.join('\n')}\n\n💡 **AI Insight:** Focus marketing efforts on these winners!`;
    }
    
    // Default enhanced response
    return `🤖 **AI Assistant Ready!**\n\nI'm analyzing your business data:\n• ${context.products.length} products in inventory\n• ${context.sales.length} total sales\n• ${context.customers.length} customers\n\n💡 **Try asking:**\n• "Which products are low on stock?"\n• "What are my sales today?"\n• "Show me my top products"\n• "What's my inventory worth?"`;
  }

  /**
   * Enhance AI response with emojis and formatting
   */
  private static enhanceResponse(response: string): string {
    // Add emojis based on content
    if (response.includes('low stock') || response.includes('running low')) {
      response = '⚠️ ' + response;
    } else if (response.includes('sales') || response.includes('revenue')) {
      response = '📊 ' + response;
    } else if (response.includes('top') || response.includes('best')) {
      response = '🏆 ' + response;
    } else if (response.includes('alert') || response.includes('warning')) {
      response = '🚨 ' + response;
    } else {
      response = '🤖 ' + response;
    }
    
    // Add AI signature
    response += '\n\n*✨ Powered by AI with your real business data*';
    
    return response;
  }

  /**
   * Query with context and fallback
   */
  static async queryWithBestAvailableAI(userQuery: string, userId: string): Promise<string> {
    try {
      // Try Hugging Face API first (if available)
      if (this.API_KEY) {
        return await this.queryWithContext(userQuery, userId);
      }
      
      // Fallback to rule-based
      const context = await this.getBusinessContext(userId);
      return this.fallbackResponse(userQuery, context);
      
    } catch (error) {
      console.error('AI query failed:', error);
      const context = await this.getBusinessContext(userId);
      return this.fallbackResponse(userQuery, context);
    }
  }
}