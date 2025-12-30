# Visual Studio Code Setup Guide

This guide will help you set up and run the AI-Driven Smart Inventory Management System in Visual Studio Code, step by step.

## Part 1: Install Required Software

### 1. Install Node.js

1. Go to [https://nodejs.org/](https://nodejs.org/)
2. Download the LTS (Long Term Support) version
3. Run the installer
4. Follow the installation wizard
5. Verify installation by opening Command Prompt or Terminal and typing:
   ```bash
   node --version
   ```
   You should see a version number like `v18.x.x` or higher

### 2. Install Visual Studio Code

1. Go to [https://code.visualstudio.com/](https://code.visualstudio.com/)
2. Download for your operating system
3. Run the installer
4. Follow the installation wizard

### 3. Create a Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub, Google, or email
4. Create a new project:
   - Enter a project name (e.g., "inventory-system")
   - Choose a database password (save this!)
   - Select a region close to you
5. Wait for the project to be created (2-3 minutes)

## Part 2: Get Your Supabase Credentials

### Finding Your Credentials

1. In your Supabase project dashboard, look at the left sidebar
2. Click on the **Settings** icon (gear icon at bottom)
3. Click on **API** in the settings menu
4. You'll see two important values:

   **Project URL**
   - Looks like: `https://xxxxxxxxxxxxx.supabase.co`
   - Click the copy icon to copy it

   **anon public key**
   - Long string of characters
   - Click the copy icon to copy it

5. Keep these values handy - you'll need them in the next step

## Part 3: Open and Configure the Project

### 1. Open the Project in VS Code

1. Open Visual Studio Code
2. Click **File** > **Open Folder**
3. Navigate to this project folder and select it
4. Click "Select Folder" or "Open"

### 2. Open the Integrated Terminal

1. In VS Code, click **View** > **Terminal** (or press Ctrl+` on Windows/Linux, Cmd+` on Mac)
2. A terminal panel will appear at the bottom of the screen

### 3. Create the Environment File

1. In VS Code's file explorer (left sidebar), you should see a file called `.env.example`
2. Right-click in the empty space below the files
3. Click **New File**
4. Name it exactly: `.env` (with a dot at the beginning)
5. Open the `.env` file you just created
6. Copy and paste this template:

```env
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

7. Replace `your_supabase_url_here` with your actual Project URL from Supabase
8. Replace `your_supabase_anon_key_here` with your actual anon key from Supabase
9. Save the file (Ctrl+S or Cmd+S)

**Example of what it should look like:**
```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Part 4: Install Dependencies and Run

### 1. Install Project Dependencies

In the VS Code terminal, type this command and press Enter:

```bash
npm install
```

This will:
- Download all required packages
- Take 1-2 minutes
- Show a progress bar
- Create a `node_modules` folder

### 2. Start the Development Server

After the installation finishes, type this command and press Enter:

```bash
npm run dev
```

You should see output like:
```
VITE v5.4.8  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h + enter to show help
```

### 3. Open in Your Browser

1. Hold Ctrl (or Cmd on Mac) and click on `http://localhost:5173/`
   OR
2. Open your web browser and go to: `http://localhost:5173/`

## Part 5: Using the Application

### First Time Login

1. You'll see a dark login screen
2. Click "Don't have an account? Sign up"
3. Enter any email address (it doesn't need to be real for testing)
4. Enter a password (minimum 6 characters)
5. Click "Sign Up"
6. You'll automatically be logged in!

### Exploring the Dashboard

The application has several sections accessible from the left sidebar:

1. **Dashboard** - Overview of your inventory and sales
2. **Inventory** - Manage products and stock levels
3. **AI Forecasting** - Generate demand predictions
4. **Reports** - Create business reports
5. **AI Assistant** - Chat with the AI about your data
6. **Customers** - View customer information
7. **Suppliers** - Manage suppliers
8. **Alerts** - View stock alerts

### Try the AI Chatbot

1. Click "AI Assistant" in the sidebar
2. Try asking questions like:
   - "Which products are running low?"
   - "What sold the most this month?"
   - "What's my inventory worth?"
   - "Do I need to restock?"

The chatbot analyzes your real data to answer!

## File Structure Explanation

Here's what the important files do:

```
project/
├── src/                          # All source code
│   ├── components/               # UI components
│   │   ├── Dashboard/           # Dashboard page
│   │   ├── Inventory/           # Inventory management
│   │   ├── Chatbot/             # AI chatbot
│   │   └── ...                  # Other features
│   ├── contexts/                # App state management
│   ├── lib/                     # Supabase connection
│   ├── App.tsx                  # Main app logic
│   └── main.tsx                 # App entry point
├── .env                         # Your Supabase credentials (YOU CREATE THIS)
├── .env.example                 # Template for .env
├── package.json                 # Project dependencies
└── README.md                    # Full documentation
```

## Backend-Frontend Connection Flow

Here's how everything connects:

1. **Frontend (React)** runs in your browser
   - Built with React + TypeScript
   - Styled with Tailwind CSS
   - Running on `http://localhost:5173`

2. **Supabase Client** (src/lib/supabase.ts)
   - Connects to your Supabase database
   - Uses credentials from `.env` file
   - Handles authentication and data

3. **Supabase Backend** (cloud)
   - PostgreSQL database
   - Authentication service
   - Real-time subscriptions
   - Row Level Security

4. **Database Tables** (automatically created)
   - products, sales, customers
   - suppliers, forecasts, alerts
   - chat_history, reports

**Flow Example - Adding a Product:**
1. You fill out the form in the browser
2. React sends data to Supabase
3. Supabase stores in database
4. Database triggers update stock alerts
5. Changes appear instantly in UI

## Chatbot Database Connection

The AI Chatbot connects directly to your database:

1. You ask: "Which products are running low?"
2. Chatbot queries the `products` table
3. Filters products where `current_stock <= min_stock_threshold`
4. Formats results in natural language
5. Saves conversation to `chat_history` table

**It's using YOUR real data - no fake AI responses!**

## Common Issues and Solutions

### Issue: "Cannot find module" errors
**Solution:**
```bash
npm install
```
Re-run the install command.

### Issue: Port 5173 is already in use
**Solution:**
1. Stop the current server (Ctrl+C in terminal)
2. Close other VS Code instances
3. Try again with `npm run dev`

### Issue: White screen / blank page
**Solution:**
1. Check browser console (F12)
2. Verify `.env` file has correct values
3. Make sure you saved the `.env` file
4. Restart the dev server

### Issue: Authentication fails
**Solution:**
1. Check Supabase credentials in `.env`
2. Make sure you're using the anon key (not service role key)
3. Try a different email/password

### Issue: Chatbot gives generic responses
**Solution:**
1. Make sure sample data loaded (check Supabase dashboard > Table Editor)
2. Try specific questions like "Which products are running low?"
3. Check that you're logged in

## Development Workflow

### Making Changes to the Code

1. **Edit files** in VS Code
2. **Save** (Ctrl+S or Cmd+S)
3. Browser **automatically refreshes** with your changes
4. Check terminal for any errors

### Stopping the Server

- Press **Ctrl+C** in the terminal
- Or close the terminal
- Server stops, browser shows connection error

### Starting Again

- Run `npm run dev` in terminal
- Server starts
- Refresh browser

## Building for Production

When ready to deploy:

```bash
npm run build
```

This creates a `dist` folder with optimized files ready for hosting.

## Next Steps

1. Explore all features in the sidebar
2. Add your own products in Inventory
3. Generate forecasts
4. Ask the chatbot questions
5. Create custom reports
6. Customize the code to your needs

## Getting Help

If you encounter issues:

1. Check this guide again
2. Read the main README.md
3. Check browser console (F12) for errors
4. Verify all steps were followed correctly
5. Make sure Node.js and dependencies are installed

## Tips for Success

1. **Save your Supabase credentials safely** - You'll need them
2. **Don't share your .env file** - It contains sensitive keys
3. **Keep the terminal open** while developing
4. **Check for typos** in file names and commands
5. **Read error messages** - They often explain the problem

---

**You're all set! Enjoy building with your AI-powered inventory system!**
