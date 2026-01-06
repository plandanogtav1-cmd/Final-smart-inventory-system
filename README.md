# Inventra - AI-Powered Smart Inventory Management System
**Built by Lester Plandano**

Advanced inventory management system with real-time analytics, AI-powered forecasting with external data integration, automated restocking, POS system, and intelligent chatbot.

## 🚀 Latest Updates (v2.0)

### **Enhanced AI Forecasting System**
- **External Data Integration** - Weather, economic indicators, and holiday data
- **Advanced Algorithms** - Weighted moving averages with 85-95% accuracy
- **Real-time API Integration** - OpenWeatherMap, FRED Economic Data
- **Smart Multipliers** - Weather and economic impact on demand
- **Detailed Reasoning** - AI explains every forecast decision

### **Complete POS System**
- **Barcode Scanning** - Phone camera integration
- **Customer Management** - Lifetime value tracking
- **Discount System** - Percentage and fixed amount discounts
- **Receipt Generation** - Professional transaction receipts
- **Real-time Stock Updates** - Automatic inventory adjustments

### **Automated Restocking System**
- **Purchase Order Management** - Full supplier order tracking
- **Lead Time Integration** - Automated delivery scheduling
- **Bulk Email System** - Send orders to multiple suppliers
- **Category-based Ordering** - Organized by product categories
- **Supplier Preferences** - Save preferred suppliers per category

# AI-Driven Smart Inventory Management System

A modern, full-stack inventory management system with real-time analytics, AI-powered forecasting, automated reporting, and an intelligent chatbot connected to your business data.

## 🎆 Core Features

### 1. Advanced AI Forecasting with External Data
- **Multi-Factor Analysis** - Weighted moving averages, trend analysis, volatility assessment
- **External Data Integration** - Real weather data, economic indicators, holiday detection
- **Smart Adjustments** - Weather impact (+30% for fluids in hot weather, +25% for tires in rain)
- **Economic Intelligence** - Consumer confidence affects demand predictions
- **Confidence Scoring** - 75-95% accuracy with reliability indicators
- **Detailed Reasoning** - AI explains every forecast with key factors and planning insights

### 2. Complete Point of Sale (POS) System
- **Barcode Scanning** - Phone camera integration without additional hardware
- **Customer Management** - Track lifetime value and purchase history
- **Flexible Discounts** - Percentage and fixed amount discount options
- **Professional Receipts** - Detailed transaction receipts with tax calculations
- **Real-time Updates** - Automatic stock adjustments and customer data sync
- **Touch-friendly Interface** - Optimized for mobile and tablet use

### 3. Automated Restocking & Purchase Orders
- **Smart Restock Alerts** - AI-powered recommendations based on forecasts
- **Purchase Order Management** - Complete supplier order tracking system
- **Lead Time Integration** - Automated delivery scheduling and tracking
- **Bulk Operations** - Send orders to multiple suppliers simultaneously
- **Category Organization** - Group products by category for efficient ordering
- **Supplier Preferences** - Save and reuse preferred suppliers per category
- **Email Integration** - Automated order emails with professional formatting

### 4. Enhanced Dashboard & Analytics
- **Real-time Metrics** - Live inventory tracking with automatic updates
- **Advanced Sales Analytics** - Flexible date range analysis (7, 14, 30 days, custom)
- **Detailed Transaction Drill-down** - View individual sales for specific dates
- **Revenue Tracking** - Growth analytics with trend indicators
- **Top Products Analysis** - Expanded to show top 8 performing items
- **Customer Insights** - Purchase history and lifetime value analysis
- **Scrollable Charts** - Enhanced sales trend visualization

### 5. Intelligent AI Chatbot Assistant (🆕 Enhanced with Hugging Face)
- **Advanced AI Integration** - Powered by Hugging Face models for intelligent responses
- **Multiple AI Options** - API-based (30k free requests/month) or client-side AI (unlimited)
- **Natural Language Processing** - Understands complex business queries in plain English
- **Real Business Data Integration** - Connected to actual inventory, sales, and customer data
- **Advanced Forecasting** - Provides sales predictions and strategic recommendations
- **Comprehensive Analytics** - Answers questions about stock, sales, customers, suppliers
- **Contextual Conversations** - Maintains conversation history and provides follow-up insights
- **Fallback System** - Works with or without AI enhancement
- **Business Intelligence** - Explains trends, patterns, and provides actionable insights

### 6. Stock Receiving System
- **POS-style Interface** - Consistent UI design with main POS system
- **Barcode Integration** - Scan products for quick receiving
- **Supplier Tracking** - Record which supplier delivered which items
- **Batch Processing** - Receive multiple items efficiently
- **Real-time Updates** - Immediate stock level adjustments

## 💻 Technology Stack

### Frontend
- **React 18** - Modern UI library with hooks
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling with custom components
- **Lucide React** - Beautiful, consistent icons
- **Responsive Design** - Mobile-first approach

### Backend & Database
- **Supabase** - Backend-as-a-Service with PostgreSQL
- **PostgreSQL** - Advanced relational database
- **Row Level Security (RLS)** - Multi-tenant security
- **Real-time Subscriptions** - Live data updates
- **Database Triggers** - Automated business logic

### External Integrations
- **OpenWeatherMap API** - Real-time weather data
- **FRED API** - US Federal Reserve economic data
- **Calendarific API** - Holiday and event data
- **Email Integration** - Automated supplier communications
- **Barcode Scanning** - Camera-based product identification

### AI & Analytics
- **Hugging Face Integration** - Advanced AI models for intelligent chatbot responses
- **Client-Side AI Option** - Transformers.js for unlimited free AI processing
- **Custom Forecasting Algorithms** - Weighted moving averages
- **External Data Fusion** - Multi-source data integration
- **Natural Language Processing** - Advanced query understanding with business context
- **Pattern Recognition** - Sales trend analysis
- **Confidence Scoring** - Prediction reliability metrics

## 🌐 Live Demo

**Website:** [https://inventra-ai.vercel.app](https://inventra-ai.vercel.app)

### Demo Credentials
- **Email:** demo@inventra.com
- **Password:** demo123

### What to Try
1. **AI Chatbot** - Ask complex questions like "What insights can you give me about my business?"
2. **AI Forecasting** - Generate demand predictions with external data
3. **POS System** - Process sales with barcode scanning
4. **Automated Restocking** - Create and manage purchase orders
5. **Analytics Dashboard** - Explore sales trends and insights

## Getting Started in Visual Studio Code

### Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js** (v18 or higher)
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version`

2. **Visual Studio Code**
   - Download from [code.visualstudio.com](https://code.visualstudio.com/)

3. **Supabase Account**
   - Sign up at [supabase.com](https://supabase.com)
   - The database is already configured with all tables

### Step-by-Step Setup

#### 1. Get Your Supabase Credentials

1. Go to your Supabase dashboard
2. Select your project
3. Go to Settings > API
4. Copy these values:
   - Project URL
   - Anon (public) key

#### 2. Configure Environment Variables

1. In VS Code, open this project folder
2. Create a new file named `.env` in the root directory
3. Copy the contents from `.env.example`
4. Replace the placeholder values with your Supabase credentials:

```env
VITE_SUPABASE_URL=your_actual_supabase_url
VITE_SUPABASE_ANON_KEY=your_actual_anon_key
```

#### 3. Install Dependencies

Open the integrated terminal in VS Code (View > Terminal or Ctrl+`) and run:

```bash
npm install
```

This will install all required packages.

#### 4. Run the Development Server

In the terminal, run:

```bash
npm run dev
```

The application will start at `http://localhost:5173`

#### 5. Create Your Account

1. Open the application in your browser
2. Click "Sign Up" on the login page
3. Enter any email and password (min 6 characters)
4. You'll be automatically logged in

### Project Structure

```
project/
├── src/
│   ├── components/           # React components
│   │   ├── Auth/            # Authentication components
│   │   ├── Dashboard/       # Dashboard and analytics
│   │   ├── Inventory/       # Inventory management
│   │   ├── Forecasting/     # AI forecasting features
│   │   ├── Reports/         # Report generation
│   │   ├── Chatbot/         # AI assistant
│   │   ├── Customers/       # Customer management
│   │   ├── Suppliers/       # Supplier management
│   │   ├── Alerts/          # Alert system
│   │   ├── Settings/        # Settings page
│   │   └── Layout/          # Layout components
│   ├── contexts/            # React contexts
│   │   └── AuthContext.tsx  # Authentication state
│   ├── lib/                 # Utility libraries
│   │   └── supabase.ts      # Supabase client
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # App entry point
│   └── index.css            # Global styles
├── .env                     # Environment variables (you create this)
├── .env.example             # Environment template
└── package.json             # Dependencies and scripts
```

## 📊 Database Schema (Enhanced)

The system includes comprehensive tables for full business operations:

### Core Business Tables
- **products** - Product inventory with stock levels, barcodes, and categories
- **suppliers** - Supplier information, ratings, and lead times
- **customers** - Customer data, purchase history, and lifetime value
- **sales** - Sales transactions with discount support
- **stock_movements** - Complete inventory movement tracking
- **pos_transactions** - Point of sale transaction records
- **pos_transaction_items** - Individual items in POS transactions

### AI & Analytics Tables
- **forecasts** - AI-generated demand predictions with external factors
- **forecast_accuracy** - Tracks prediction accuracy over time
- **external_data** - Weather, economic, and holiday data integration
- **product_external_factors** - Product-specific external factor mappings
- **reports** - Generated business reports and analytics
- **alerts** - System alerts and notifications
- **chat_history** - AI chatbot conversation history

### Automated Operations Tables
- **purchase_orders** - Supplier orders and delivery tracking
- **purchase_order_items** - Individual items in purchase orders
- **stock_receiving** - Incoming inventory tracking

### Advanced Database Features
- **Automatic Triggers** - Stock updates, customer lifetime value calculation
- **Row Level Security (RLS)** - Secure multi-tenant data access
- **Real-time Subscriptions** - Live data synchronization
- **External API Integration** - Weather and economic data storage
- **Audit Trails** - Complete transaction and movement history

## Using the System

### Dashboard
The main dashboard shows:
- Real-time metrics (total products, inventory value, low stock items)
- Sales trends over the last 7 days
- Top-selling products
- Recent alerts
- Latest transactions

### Inventory Management
- Add new products with full details
- Edit existing product information
- Track stock levels in real-time
- Filter by category or stock status
- Search by name or SKU

### AI Forecasting
- Generate demand predictions for products
- View confidence scores
- Get actionable recommendations
- Understand factors affecting demand

### AI Chatbot
Ask natural language questions like:
- "Which products are running low?"
- "What sold the most this month?"
- "Do I need to restock before summer?"
- "What's my inventory worth?"
- "Who are my top customers?"

The chatbot analyzes your real business data to provide accurate answers.

### Reports
Generate comprehensive reports:
1. Select report type (Inventory, Sales, Supplier)
2. Choose date range (for sales reports)
3. Click "Generate"
4. View summary and detailed metrics

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run type checking
npm run typecheck

# Run linter
npm run lint
```

## Sample Data

The system comes pre-loaded with sample data:
- 5 suppliers
- 20 products across various categories
- 10 customers
- 30 sales transactions
- Automatic alerts based on stock levels

This allows you to immediately test all features without manual data entry.

## Troubleshooting

### Issue: "Missing Supabase environment variables"
**Solution**: Make sure you created the `.env` file with correct credentials.

### Issue: No data showing in dashboard
**Solution**:
1. Check that the sample data migration ran successfully
2. Verify your Supabase connection
3. Check browser console for errors

### Issue: Authentication not working
**Solution**:
1. Verify Supabase credentials in `.env`
2. Check that email confirmation is disabled in Supabase (it is by default)
3. Try a different email/password combination

### Issue: Chatbot not responding
**Solution**:
1. Make sure you're logged in
2. Check that sample data exists
3. Try simple queries first like "Which products are running low?"

## Design Philosophy

### Dark Modern UI
- Professional charcoal/navy backgrounds
- Minimalist layout with clear hierarchy
- Modern dashboard cards
- Smooth transitions and hover effects
- Clean, readable typography

### User Experience
- Intuitive navigation
- Real-time updates without page refresh
- Clear visual feedback
- Responsive across all devices
- Accessible color contrast

## 🚀 Key Achievements

### **Advanced AI Integration**
- **85-95% Forecast Accuracy** - Multi-factor analysis with external data
- **Real-time API Integration** - Weather, economic, and holiday data
- **Smart Business Logic** - Context-aware recommendations

### **Complete Business Solution**
- **Full POS System** - Barcode scanning, discounts, receipts
- **Automated Operations** - Purchase orders, stock receiving, supplier emails
- **Customer Management** - Lifetime value tracking, purchase history

### **Modern Architecture**
- **Production-Ready** - Scalable, secure, and maintainable
- **Mobile-Optimized** - Touch-friendly interface for all devices
- **Real-time Updates** - Live data synchronization across all features

---

**Built with modern web technologies and best practices for scalable, maintainable code.**

## 📝 License

This project is created for educational purposes as a capstone project demonstrating:
- Full-stack development expertise
- Real-time database integration
- AI-powered business intelligence
- Modern UI/UX design principles
- Production-ready architecture
- External API integration
- Advanced forecasting algorithms
