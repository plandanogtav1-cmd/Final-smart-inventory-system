/*
  # AI-Driven Smart Inventory Management System Schema

  ## Overview
  This migration creates a complete database schema for an AI-powered inventory management system
  with real-time tracking, analytics, forecasting, and AI chatbot capabilities.

  ## New Tables

  ### 1. Products
  - `id` (uuid, primary key) - Unique product identifier
  - `sku` (text, unique) - Stock keeping unit code
  - `name` (text) - Product name
  - `description` (text) - Product description
  - `category` (text) - Product category
  - `unit_price` (decimal) - Selling price per unit
  - `cost_price` (decimal) - Cost per unit
  - `current_stock` (integer) - Current stock level
  - `min_stock_threshold` (integer) - Minimum stock before alert
  - `max_stock_threshold` (integer) - Maximum stock level
  - `reorder_point` (integer) - Stock level to trigger reorder
  - `reorder_quantity` (integer) - Suggested reorder amount
  - `supplier_id` (uuid) - Reference to supplier
  - `is_active` (boolean) - Product status
  - `image_url` (text) - Product image
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. Suppliers
  - `id` (uuid, primary key) - Unique supplier identifier
  - `name` (text) - Supplier name
  - `contact_person` (text) - Contact person name
  - `email` (text) - Contact email
  - `phone` (text) - Contact phone
  - `address` (text) - Supplier address
  - `lead_time_days` (integer) - Average delivery time
  - `rating` (decimal) - Supplier performance rating
  - `is_active` (boolean) - Supplier status
  - `created_at` (timestamptz) - Creation timestamp

  ### 3. Customers
  - `id` (uuid, primary key) - Unique customer identifier
  - `name` (text) - Customer name
  - `email` (text) - Customer email
  - `phone` (text) - Customer phone
  - `address` (text) - Customer address
  - `customer_type` (text) - Type (retail, wholesale, etc.)
  - `total_purchases` (decimal) - Lifetime purchase value
  - `created_at` (timestamptz) - Creation timestamp

  ### 4. Sales
  - `id` (uuid, primary key) - Unique sale identifier
  - `product_id` (uuid) - Reference to product
  - `customer_id` (uuid) - Reference to customer
  - `quantity` (integer) - Quantity sold
  - `unit_price` (decimal) - Price per unit at time of sale
  - `total_amount` (decimal) - Total sale amount
  - `sale_date` (timestamptz) - Date of sale
  - `payment_method` (text) - Payment method used
  - `status` (text) - Sale status (completed, pending, cancelled)
  - `created_at` (timestamptz) - Creation timestamp

  ### 5. Stock Movements
  - `id` (uuid, primary key) - Unique movement identifier
  - `product_id` (uuid) - Reference to product
  - `movement_type` (text) - Type (purchase, sale, adjustment, return)
  - `quantity` (integer) - Quantity moved (positive or negative)
  - `previous_stock` (integer) - Stock level before movement
  - `new_stock` (integer) - Stock level after movement
  - `reference_id` (uuid) - Reference to sale or purchase
  - `notes` (text) - Additional notes
  - `created_at` (timestamptz) - Movement timestamp
  - `created_by` (uuid) - User who created the movement

  ### 6. Alerts
  - `id` (uuid, primary key) - Unique alert identifier
  - `product_id` (uuid) - Reference to product
  - `alert_type` (text) - Type (low_stock, overstock, inactive, expiring)
  - `severity` (text) - Severity level (low, medium, high, critical)
  - `message` (text) - Alert message
  - `is_read` (boolean) - Read status
  - `is_resolved` (boolean) - Resolution status
  - `created_at` (timestamptz) - Alert timestamp

  ### 7. Forecasts
  - `id` (uuid, primary key) - Unique forecast identifier
  - `product_id` (uuid) - Reference to product
  - `forecast_date` (date) - Date of forecast
  - `predicted_demand` (integer) - Predicted demand quantity
  - `confidence_score` (decimal) - Confidence level (0-100)
  - `factors` (jsonb) - Factors influencing prediction
  - `recommendation` (text) - AI recommendation
  - `created_at` (timestamptz) - Forecast creation timestamp

  ### 8. Reports
  - `id` (uuid, primary key) - Unique report identifier
  - `report_type` (text) - Type (inventory, sales, supplier, forecast)
  - `report_name` (text) - Report name
  - `date_from` (date) - Start date for report
  - `date_to` (date) - End date for report
  - `data` (jsonb) - Report data
  - `summary` (text) - Report summary
  - `created_by` (uuid) - User who generated report
  - `created_at` (timestamptz) - Report generation timestamp

  ### 9. Chat History
  - `id` (uuid, primary key) - Unique message identifier
  - `user_id` (uuid) - User who sent message
  - `message` (text) - User message
  - `response` (text) - AI response
  - `context_data` (jsonb) - Data used to generate response
  - `created_at` (timestamptz) - Message timestamp

  ## Security
  - Enable RLS on all tables
  - Add policies for authenticated users to manage their data
  - Implement proper access controls for sensitive information
*/

-- Create Products Table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text UNIQUE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL,
  unit_price decimal(10, 2) NOT NULL DEFAULT 0,
  cost_price decimal(10, 2) NOT NULL DEFAULT 0,
  current_stock integer NOT NULL DEFAULT 0,
  min_stock_threshold integer NOT NULL DEFAULT 10,
  max_stock_threshold integer NOT NULL DEFAULT 1000,
  reorder_point integer NOT NULL DEFAULT 20,
  reorder_quantity integer NOT NULL DEFAULT 50,
  supplier_id uuid,
  is_active boolean DEFAULT true,
  image_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text DEFAULT '',
  email text DEFAULT '',
  phone text DEFAULT '',
  address text DEFAULT '',
  lead_time_days integer DEFAULT 7,
  rating decimal(3, 2) DEFAULT 5.00,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text DEFAULT '',
  phone text DEFAULT '',
  address text DEFAULT '',
  customer_type text DEFAULT 'retail',
  total_purchases decimal(12, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create Sales Table
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  quantity integer NOT NULL,
  unit_price decimal(10, 2) NOT NULL,
  total_amount decimal(12, 2) NOT NULL,
  sale_date timestamptz DEFAULT now(),
  payment_method text DEFAULT 'cash',
  status text DEFAULT 'completed',
  created_at timestamptz DEFAULT now()
);

-- Create Stock Movements Table
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  movement_type text NOT NULL,
  quantity integer NOT NULL,
  previous_stock integer NOT NULL,
  new_stock integer NOT NULL,
  reference_id uuid,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  severity text DEFAULT 'medium',
  message text NOT NULL,
  is_read boolean DEFAULT false,
  is_resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create Forecasts Table
CREATE TABLE IF NOT EXISTS forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  forecast_date date NOT NULL,
  predicted_demand integer NOT NULL,
  confidence_score decimal(5, 2) DEFAULT 0,
  factors jsonb DEFAULT '{}',
  recommendation text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create Reports Table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type text NOT NULL,
  report_name text NOT NULL,
  date_from date,
  date_to date,
  data jsonb DEFAULT '{}',
  summary text DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create Chat History Table
CREATE TABLE IF NOT EXISTS chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  response text NOT NULL,
  context_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraint for supplier_id in products
ALTER TABLE products 
ADD CONSTRAINT fk_products_supplier 
FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_sales_product ON sales(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_alerts_product ON alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_forecasts_product ON forecasts(product_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_user ON chat_history(user_id);

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Products
CREATE POLICY "Authenticated users can view products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for Suppliers
CREATE POLICY "Authenticated users can view suppliers"
  ON suppliers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert suppliers"
  ON suppliers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update suppliers"
  ON suppliers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete suppliers"
  ON suppliers FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for Customers
CREATE POLICY "Authenticated users can view customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete customers"
  ON customers FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for Sales
CREATE POLICY "Authenticated users can view sales"
  ON sales FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sales"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sales"
  ON sales FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete sales"
  ON sales FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for Stock Movements
CREATE POLICY "Authenticated users can view stock movements"
  ON stock_movements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert stock movements"
  ON stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for Alerts
CREATE POLICY "Authenticated users can view alerts"
  ON alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert alerts"
  ON alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update alerts"
  ON alerts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete alerts"
  ON alerts FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for Forecasts
CREATE POLICY "Authenticated users can view forecasts"
  ON forecasts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert forecasts"
  ON forecasts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for Reports
CREATE POLICY "Authenticated users can view reports"
  ON reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for Chat History
CREATE POLICY "Users can view their own chat history"
  ON chat_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat messages"
  ON chat_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to update product stock after sale
CREATE OR REPLACE FUNCTION update_product_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    UPDATE products
    SET current_stock = current_stock - NEW.quantity,
        updated_at = now()
    WHERE id = NEW.product_id;
    
    INSERT INTO stock_movements (
      product_id, 
      movement_type, 
      quantity, 
      previous_stock, 
      new_stock, 
      reference_id,
      notes
    )
    SELECT 
      NEW.product_id,
      'sale',
      -NEW.quantity,
      current_stock + NEW.quantity,
      current_stock,
      NEW.id,
      'Automatic stock update from sale'
    FROM products
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update stock on sale
CREATE TRIGGER trigger_update_stock_on_sale
AFTER INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION update_product_stock_on_sale();

-- Function to generate alerts for low stock
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_stock <= NEW.min_stock_threshold AND (OLD.current_stock IS NULL OR OLD.current_stock > NEW.min_stock_threshold) THEN
    INSERT INTO alerts (product_id, alert_type, severity, message)
    VALUES (
      NEW.id,
      'low_stock',
      CASE 
        WHEN NEW.current_stock <= NEW.min_stock_threshold / 2 THEN 'critical'
        ELSE 'high'
      END,
      format('Product "%s" is running low on stock. Current: %s, Minimum: %s', NEW.name, NEW.current_stock, NEW.min_stock_threshold)
    );
  END IF;
  
  IF NEW.current_stock >= NEW.max_stock_threshold AND (OLD.current_stock IS NULL OR OLD.current_stock < NEW.max_stock_threshold) THEN
    INSERT INTO alerts (product_id, alert_type, severity, message)
    VALUES (
      NEW.id,
      'overstock',
      'medium',
      format('Product "%s" is overstocked. Current: %s, Maximum: %s', NEW.name, NEW.current_stock, NEW.max_stock_threshold)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to check stock levels
CREATE TRIGGER trigger_check_stock_levels
AFTER INSERT OR UPDATE OF current_stock ON products
FOR EACH ROW
EXECUTE FUNCTION check_low_stock();

-- Function to update customer total purchases
CREATE OR REPLACE FUNCTION update_customer_purchases()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.customer_id IS NOT NULL THEN
    UPDATE customers
    SET total_purchases = total_purchases + NEW.total_amount
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update customer purchases
CREATE TRIGGER trigger_update_customer_purchases
AFTER INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION update_customer_purchases();