/*
  # Populate Sample Data for Testing

  This migration populates the database with realistic sample data for testing and demonstration purposes.

  ## Sample Data Includes:
  1. Suppliers - 5 sample suppliers with contact information
  2. Products - 20 sample products across various categories
  3. Customers - 10 sample customers with purchase history
  4. Sales - 30 sample sales transactions
  5. Forecasts - Sample AI forecasts for top products
  6. Alerts - Sample alerts for low stock items

  This data allows for immediate testing of all system features including:
  - Dashboard analytics
  - Inventory tracking
  - Sales reporting
  - AI chatbot queries
  - Forecasting
*/

-- Insert Sample Suppliers
INSERT INTO suppliers (name, contact_person, email, phone, address, lead_time_days, rating, is_active) VALUES
  ('Fresh Farm Produce', 'Maria Rodriguez', 'maria@freshfarm.com', '555-0101', '123 Farm Rd, Fresno, CA', 2, 4.80, true),
  ('Dairy Direct', 'Tom Wilson', 'tom@dairydirect.com', '555-0102', '456 Milk Ave, Wisconsin, WI', 3, 4.50, true),
  ('Bakery Wholesale', 'Lisa Chen', 'lisa@bakerywholesale.com', '555-0103', '789 Bread St, Portland, OR', 1, 4.90, true),
  ('Meat Masters', 'John Davis', 'john@meatmasters.com', '555-0104', '321 Butcher Ln, Texas, TX', 2, 4.20, true),
  ('Snack Supply Co', 'Sarah Lee', 'sarah@snacksupply.com', '555-0105', '654 Snack Blvd, Atlanta, GA', 5, 4.70, true)
ON CONFLICT (id) DO NOTHING;

-- Get supplier IDs for reference
DO $$
DECLARE
  supplier1_id uuid;
  supplier2_id uuid;
  supplier3_id uuid;
  supplier4_id uuid;
  supplier5_id uuid;
BEGIN
  SELECT id INTO supplier1_id FROM suppliers WHERE name = 'Fresh Farm Produce' LIMIT 1;
  SELECT id INTO supplier2_id FROM suppliers WHERE name = 'Dairy Direct' LIMIT 1;
  SELECT id INTO supplier3_id FROM suppliers WHERE name = 'Bakery Wholesale' LIMIT 1;
  SELECT id INTO supplier4_id FROM suppliers WHERE name = 'Meat Masters' LIMIT 1;
  SELECT id INTO supplier5_id FROM suppliers WHERE name = 'Snack Supply Co' LIMIT 1;

  -- Insert Sample Products
  INSERT INTO products (sku, name, description, category, unit_price, cost_price, current_stock, min_stock_threshold, max_stock_threshold, reorder_point, reorder_quantity, supplier_id, barcode, is_active) VALUES
    ('PROD-001', 'Organic Apples', 'Fresh organic red apples per lb', 'Produce', 3.99, 2.00, 50, 10, 200, 15, 50, supplier1_id, '1234567890123', true),
    ('PROD-002', 'Whole Milk', '1 gallon whole milk', 'Dairy', 4.99, 2.50, 30, 5, 100, 10, 25, supplier2_id, '1234567890124', true),
    ('PROD-003', 'White Bread', 'Fresh baked white bread loaf', 'Bakery', 2.99, 1.50, 8, 20, 150, 25, 40, supplier3_id, '1234567890125', true),
    ('PROD-004', 'Ground Beef', 'Fresh ground beef per lb', 'Meat', 6.99, 4.00, 25, 8, 80, 12, 20, supplier4_id, '1234567890126', true),
    ('PROD-005', 'Potato Chips', 'Classic salted potato chips', 'Snacks', 3.49, 1.75, 45, 15, 200, 20, 50, supplier5_id, '1234567890127', true),
    ('PROD-006', 'Bananas', 'Fresh bananas per lb', 'Produce', 1.99, 1.00, 60, 20, 300, 30, 80, supplier1_id, '1234567890128', true),
    ('PROD-007', 'Cheddar Cheese', 'Sharp cheddar cheese block', 'Dairy', 5.99, 3.00, 35, 10, 120, 15, 30, supplier2_id, '1234567890129', true),
    ('PROD-008', 'Chocolate Cake', 'Double chocolate layer cake', 'Bakery', 12.99, 6.50, 12, 5, 50, 8, 15, supplier3_id, '1234567890130', true),
    ('PROD-009', 'Chicken Breast', 'Boneless chicken breast per lb', 'Meat', 8.99, 5.00, 20, 8, 100, 12, 25, supplier4_id, '1234567890131', true),
    ('PROD-010', 'Cookies', 'Chocolate chip cookies pack', 'Snacks', 4.99, 2.50, 40, 12, 150, 18, 35, supplier5_id, '1234567890132', true),
    ('PROD-011', 'Orange Juice', 'Fresh squeezed orange juice', 'Beverages', 5.49, 2.75, 28, 10, 120, 15, 30, supplier2_id, '1234567890133', true),
    ('PROD-012', 'Salmon Fillet', 'Fresh Atlantic salmon per lb', 'Meat', 14.99, 8.00, 15, 5, 60, 8, 15, supplier4_id, '1234567890134', true),
    ('PROD-013', 'Lettuce', 'Fresh iceberg lettuce head', 'Produce', 2.49, 1.25, 3, 25, 200, 30, 60, supplier1_id, '1234567890135', true),
    ('PROD-014', 'Yogurt', 'Greek vanilla yogurt cup', 'Dairy', 1.99, 1.00, 55, 20, 250, 30, 75, supplier2_id, '1234567890136', true),
    ('PROD-015', 'Bagels', 'Everything bagels 6-pack', 'Bakery', 3.99, 2.00, 22, 8, 80, 12, 25, supplier3_id, '1234567890137', true),
    ('PROD-016', 'Pasta', 'Spaghetti pasta box', 'Pantry', 1.99, 1.00, 75, 25, 300, 35, 100, supplier5_id, '1234567890138', true),
    ('PROD-017', 'Tomatoes', 'Fresh vine tomatoes per lb', 'Produce', 3.99, 2.00, 40, 15, 150, 20, 45, supplier1_id, '1234567890139', true),
    ('PROD-018', 'Ice Cream', 'Vanilla ice cream pint', 'Frozen', 4.99, 2.50, 32, 12, 100, 18, 35, supplier2_id, '1234567890140', true),
    ('PROD-019', 'Energy Bars', 'Protein energy bars 12-pack', 'Snacks', 8.99, 4.50, 25, 8, 80, 12, 20, supplier5_id, '1234567890141', true),
    ('PROD-020', 'Cereal', 'Whole grain cereal box', 'Breakfast', 4.49, 2.25, 48, 15, 180, 22, 50, supplier5_id, '1234567890142', true)
  ON CONFLICT (sku) DO NOTHING;

  -- Insert Sample Customers
  INSERT INTO customers (name, email, phone, address, customer_type, total_purchases) VALUES
    ('Jennifer Smith', 'jennifer@email.com', '555-1001', '100 Oak St, Springfield, IL', 'retail', 0),
    ('Mike Johnson', 'mike@email.com', '555-1002', '200 Pine Ave, Madison, WI', 'wholesale', 0),
    ('Sarah Davis', 'sarah@email.com', '555-1003', '300 Elm Rd, Austin, TX', 'retail', 0),
    ('Robert Brown', 'robert@email.com', '555-1004', '400 Maple St, Denver, CO', 'retail', 0),
    ('Lisa Wilson', 'lisa@email.com', '555-1005', '500 Cedar Dr, Portland, OR', 'wholesale', 0),
    ('David Garcia', 'david@email.com', '555-1006', '600 Birch Ln, Phoenix, AZ', 'retail', 0),
    ('Amy Martinez', 'amy@email.com', '555-1007', '700 Ash Ave, Seattle, WA', 'retail', 0),
    ('Chris Taylor', 'chris@email.com', '555-1008', '800 Willow St, Miami, FL', 'wholesale', 0),
    ('Jessica Lee', 'jessica@email.com', '555-1009', '900 Spruce Rd, Boston, MA', 'retail', 0),
    ('Kevin Anderson', 'kevin@email.com', '555-1010', '1000 Poplar Blvd, Atlanta, GA', 'retail', 0)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Insert Sample Sales (this will automatically update stock and trigger alerts)
DO $$
DECLARE
  product_rec RECORD;
  customer_rec RECORD;
  sale_date timestamptz;
  i integer;
BEGIN
  -- Create sales over the past 30 days
  FOR i IN 1..30 LOOP
    sale_date := now() - (i || ' days')::interval;
    
    -- Get random products and customers
    FOR product_rec IN (SELECT id, unit_price FROM products ORDER BY random() LIMIT 3) LOOP
      FOR customer_rec IN (SELECT id FROM customers ORDER BY random() LIMIT 1) LOOP
        INSERT INTO sales (product_id, customer_id, quantity, unit_price, total_amount, sale_date, payment_method, status)
        VALUES (
          product_rec.id,
          customer_rec.id,
          (FLOOR(random() * 5) + 1)::integer,
          product_rec.unit_price,
          product_rec.unit_price * (FLOOR(random() * 5) + 1),
          sale_date,
          CASE FLOOR(random() * 3)
            WHEN 0 THEN 'cash'
            WHEN 1 THEN 'credit_card'
            ELSE 'debit_card'
          END,
          'completed'
        );
      END LOOP;
    END LOOP;
  END LOOP;
END $$;