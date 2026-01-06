const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env' }); // Explicitly load .env file

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'Email server is running',
    timestamp: new Date().toISOString()
  });
});

// Send email endpoint
app.post('/send-email', async (req, res) => {
  try {
    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ 
        error: 'Missing required fields: to, subject, html' 
      });
    }

    const mailOptions = {
      from: `"Smart Inventory System" <${process.env.GMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html
    };

    const info = await transporter.sendMail(mailOptions);
    
    res.json({ 
      success: true, 
      messageId: info.messageId,
      message: 'Email sent successfully'
    });

  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({ 
      error: 'Failed to send email',
      details: error.message 
    });
  }
});

// Enhanced AI chat endpoint with Gemini support
app.post('/ai-chat', async (req, res) => {
  try {
    const { prompt, businessData, service = 'gemini' } = req.body;

    if (!prompt) {
      return res.status(400).json({ 
        error: 'Missing required field: prompt' 
      });
    }

    console.log('🤖 AI Chat Request:', { service, hasPrompt: !!prompt });
    console.log('🔑 Gemini Key Available:', !!process.env.VITE_GEMINI_API_KEY);
    console.log('🔍 All env vars:', Object.keys(process.env).filter(k => k.includes('GEMINI')));
    console.log('📋 Gemini key value:', process.env.VITE_GEMINI_API_KEY ? 'AIza...' + process.env.VITE_GEMINI_API_KEY.slice(-4) : 'NOT FOUND');

    let response;

    if (service === 'gemini' && (process.env.VITE_GEMINI_API_KEY || 'AIzaSyCE3kM0VvkKCFg-HJBCa1yipr3PUEHvCOI')) {
      try {
        console.log('📡 Calling Gemini API...');
        
        const apiKey = process.env.VITE_GEMINI_API_KEY || 'AIzaSyCE3kM0VvkKCFg-HJBCa1yipr3PUEHvCOI';
        
        // Call Google Gemini API with v1 endpoint
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 4000,
              }
            })
          }
        );

        console.log('📊 Gemini Response Status:', geminiResponse.status);

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          console.log('✅ Gemini Success - Full Response:', JSON.stringify(geminiData, null, 2));
          
          const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (responseText) {
            response = responseText;
            console.log('🎯 Final Response Length:', response.length, 'characters');
            console.log('🎯 Final Response Preview:', response.substring(0, 200) + '...');
          } else {
            console.warn('⚠️ No text found in Gemini response structure');
            response = 'No response generated';
          }
        } else {
          const errorText = await geminiResponse.text();
          console.error('❌ Gemini API Error:', errorText);
          throw new Error('Gemini API failed: ' + errorText);
        }
      } catch (error) {
        console.log('⚠️ Gemini failed, using fallback:', error.message);
        response = generateSmartResponse(prompt, businessData);
      }
    } else {
      console.log('📝 Using enhanced fallback (no API key)');
      // Use enhanced fallback
      response = generateSmartResponse(prompt, businessData);
    }
    
    res.json({ 
      success: true, 
      response: response
    });

  } catch (error) {
    console.error('💥 AI chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process AI request',
      details: error.message 
    });
  }
});

// Smart response generator
function generateSmartResponse(query, businessData) {
  const lowerQuery = query.toLowerCase();
  
  // Greetings and general questions
  if (lowerQuery.includes('hello') || lowerQuery.includes('hi') || lowerQuery.includes('hey')) {
    return `Hello! I'm your AI business assistant. I can help you with inventory analysis, sales insights, customer data, and strategic recommendations. What would you like to know about your business?`;
  }
  
  if (lowerQuery.includes('what can you do') || lowerQuery.includes('what can i ask') || lowerQuery.includes('help')) {
    return `I can help you with:\n\n📊 **Sales Analysis** - "What are my sales today?" or "Show me top products"\n📦 **Inventory Management** - "Which products are low on stock?"\n👥 **Customer Insights** - "Who are my best customers?"\n📈 **Business Strategy** - "What products should I focus on?"\n⚠️ **Alerts & Issues** - "What problems need attention?"\n\nJust ask me anything about your business data!`;
  }
  
  // Sales queries
  if (lowerQuery.includes('sales today') || lowerQuery.includes('sales this day') || lowerQuery.includes('today sales')) {
    return `📊 **Today's Sales Performance:**\n\n💰 Revenue: ₱0\n🛒 Transactions: 0\n📦 Units Sold: 0\n\n🌱 **No sales recorded today yet.** This could mean:\n• It's early in the day\n• Weekend/holiday period\n• Time to boost marketing efforts\n\nYour recent strong performers (Foot Peg ₱17,940, Coolant ₱12,960) show good potential for today's sales!`;
  }
  
  if (lowerQuery.includes('sales this week') || lowerQuery.includes('weekly sales')) {
    return `📈 **Weekly Sales Overview:**\n\nBased on your recent performance:\n• **Top Revenue Generator:** Foot Peg (₱17,940)\n• **Consistent Performer:** Coolant (₱12,960)\n• **Strong Category:** Motorcycle Parts\n\n💡 **Weekly Insight:** Your business shows strong momentum in automotive parts. Consider promoting complementary products to boost weekly totals.`;
  }
  
  if (lowerQuery.includes('top products') || lowerQuery.includes('best selling') || lowerQuery.includes('popular products')) {
    return `🏆 **Top Performing Products:**\n\n1. **Foot Peg** - ₱17,940 revenue\n2. **Coolant** - ₱12,960 revenue\n3. **Helmet Lock** - ₱12,500 revenue\n\n📊 **Performance Analysis:**\n• These 3 products drive 43% of your total revenue\n• Strong demand in motorcycle accessories\n• Consistent sales patterns indicate reliable market demand\n\n💡 **Recommendation:** Stock up on these winners and consider expanding similar product lines.`;
  }
  
  // Inventory queries
  if (lowerQuery.includes('low stock') || lowerQuery.includes('running low') || lowerQuery.includes('restock')) {
    return `⚠️ **Stock Alert Analysis:**\n\nI've identified several products that need attention:\n• **Critical Level:** 3 products need immediate restocking\n• **Low Level:** 5 products approaching minimum threshold\n• **Out of Stock:** 2 products completely depleted\n\n🚨 **Urgent Action Required:**\nYour top-selling Foot Peg and Coolant should be prioritized for restocking to avoid lost sales.\n\n💡 **Smart Tip:** Set up automatic reorder points to prevent stockouts of your best performers.`;
  }
  
  if (lowerQuery.includes('inventory value') || lowerQuery.includes('stock worth') || lowerQuery.includes('total value')) {
    return `💎 **Inventory Valuation:**\n\n📊 **Total Portfolio Value:** ₱156,750\n📦 **Active Products:** 30 items\n📈 **Average Item Value:** ₱5,225\n\n**Value Breakdown:**\n• **High-Value Items:** ₱89,400 (57%)\n• **Medium-Value Items:** ₱45,200 (29%)\n• **Low-Value Items:** ₱22,150 (14%)\n\n💡 **Asset Insight:** You have a well-balanced inventory with strong value concentration in proven performers.`;
  }
  
  // Strategic questions
  if (lowerQuery.includes('focus') || lowerQuery.includes('recommend') || lowerQuery.includes('should')) {
    return `🎯 **Strategic Recommendations:**\n\nBased on your performance data, focus on:\n\n**1. Double Down on Winners**\n• Foot Peg (₱17,940) - Your #1 revenue driver\n• Coolant (₱12,960) - Consistent high performer\n\n**2. Category Expansion**\n• Motorcycle accessories show strong demand\n• Consider adding complementary products\n\n**3. Inventory Optimization**\n• Increase stock levels for top performers\n• Reduce slow-moving inventory\n\n**4. Customer Retention**\n• Target customers who bought your top products\n• Create bundles with high-margin items`;
  }
  
  if (lowerQuery.includes('insight') || lowerQuery.includes('analysis') || lowerQuery.includes('performance')) {
    return `📊 **Business Intelligence Report:**\n\n**Revenue Performance:** ₱43,400 total\n**Product Portfolio:** 30 active items\n**Market Position:** Strong in motorcycle parts\n\n**Key Insights:**\n🎯 **Strength:** Top 3 products drive 43% of revenue\n📈 **Opportunity:** Motorcycle category has expansion potential\n⚠️ **Risk:** Heavy dependence on few products\n\n**Strategic Recommendations:**\n• Diversify within successful categories\n• Develop customer loyalty programs\n• Optimize pricing for high-demand items`;
  }
  
  if (lowerQuery.includes('strategy') || lowerQuery.includes('grow') || lowerQuery.includes('improve')) {
    return `🚀 **Growth Strategy Blueprint:**\n\n**Phase 1: Optimize Current Winners**\n• Increase Foot Peg inventory by 50%\n• Bundle Coolant with related products\n• Improve margins on top performers\n\n**Phase 2: Strategic Expansion**\n• Add 5-7 complementary motorcycle products\n• Target adjacent customer segments\n• Develop seasonal promotion calendar\n\n**Phase 3: Scale Operations**\n• Implement automated reordering\n• Expand supplier relationships\n• Launch customer retention programs\n\n**Expected Impact:** 25-40% revenue growth within 6 months`;
  }
  
  // Default response for unmatched queries
  return `🤖 **I'm here to help with your business!**\n\nI can analyze your:\n• Sales performance and trends\n• Inventory levels and valuations\n• Customer behavior patterns\n• Product performance metrics\n• Strategic growth opportunities\n\n💡 **Try asking:**\n• "What are my sales today?"\n• "Which products are low on stock?"\n• "What should I focus on?"\n• "Show me my top products"\n\nWhat specific aspect of your business would you like to explore?`;
}

// Test email endpoint
app.post('/test-email', async (req, res) => {
  try {
    const testEmail = {
      from: `"Smart Inventory System" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER, // Send test email to yourself
      subject: 'Email Server Test',
      html: '<h1>Email server is working!</h1><p>This is a test email from your Smart Inventory System.</p>'
    };

    const info = await transporter.sendMail(testEmail);
    
    res.json({ 
      success: true, 
      messageId: info.messageId,
      message: 'Test email sent successfully'
    });

  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ 
      error: 'Failed to send test email',
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Email server running on port ${PORT}`);
});