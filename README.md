# Smart Inventory Management System
**Built by Lester Plandano**
AI-Driven Inventory Management with Real-time Analytics, Automated Restocking, and Intelligent Chatbot.

# AI-Driven Smart Inventory Management System

A modern, full-stack inventory management system with real-time analytics, AI-powered forecasting, automated reporting, and an intelligent chatbot connected to your business data.

## Features

### 1. Real-Time Dashboard & Analytics
- Live inventory tracking with automatic updates
- Sales performance metrics and trends
- Stock level monitoring with visual indicators
- Revenue tracking and growth analytics
- Top-selling products analysis
- Customer insights and purchase history

### 2. AI-Powered Inventory Forecasting
- Predictive demand analysis based on historical sales
- Intelligent restock recommendations
- Confidence scoring for predictions
- Seasonal trend detection
- Plain-language explanations of forecasts

### 3. Real-Time Inventory Tracking
- Comprehensive product management
- Automatic stock updates on sales
- Low stock alerts and notifications
- Multi-level stock thresholds (minimum, reorder, maximum)
- Category-based filtering and search

### 4. Automated Reporting
- Generate reports by date range
- Inventory value reports
- Sales performance reports
- Supplier performance analysis
- Export capabilities
- Executive summaries with key insights

### 5. AI Chatbot Assistant
- Natural language query processing
- Connected to real business data
- Answers questions about:
  - Stock levels and alerts
  - Sales performance
  - Top products and customers
  - Restocking needs
  - Inventory value
- Context-aware responses
- Chat history tracking

### 6. Additional Features
- Customer relationship management
- Supplier management with ratings
- Alert system for critical events
- Dark, modern, professional UI
- Fully responsive design
- Real-time database synchronization

## Technology Stack

### Frontend
- **React 18** - Modern UI library
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Beautiful icons

### Backend & Database
- **Supabase** - Backend-as-a-Service
- **PostgreSQL** - Relational database
- **Row Level Security (RLS)** - Data security
- **Real-time subscriptions** - Live updates

### Key Features
- Email/password authentication
- Automatic stock tracking
- Database triggers for alerts
- Real-time analytics
- AI-powered insights

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

## Database Schema

The system includes the following tables:

### Core Tables
- **products** - Product inventory with stock levels
- **suppliers** - Supplier information and ratings
- **customers** - Customer data and purchase history
- **sales** - Sales transactions
- **stock_movements** - Inventory movement tracking

### AI & Analytics Tables
- **forecasts** - AI-generated demand predictions
- **reports** - Generated business reports
- **alerts** - System alerts and notifications
- **chat_history** - Chatbot conversation history

### Database Features
- Automatic stock updates on sales
- Automatic alert generation for low stock
- Customer purchase tracking
- Real-time data synchronization
- Secure row-level security

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

## Future Enhancements

Potential features to add:
- Advanced AI models for forecasting
- Multi-location inventory tracking
- Barcode scanning integration
- Email notifications for alerts
- Advanced reporting with charts
- Export to PDF/Excel
- Mobile app
- Integration with e-commerce platforms

## Support & Contribution

This is a capstone project demonstrating:
- Full-stack development
- Real-time database integration
- AI-powered features
- Modern UI/UX design
- Production-ready architecture

## License

This project is created for educational purposes as a capstone project.

---

**Built with modern web technologies and best practices for scalable, maintainable code.**
