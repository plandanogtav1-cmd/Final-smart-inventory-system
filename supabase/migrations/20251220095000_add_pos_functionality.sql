-- Add POS functionality to existing inventory system

-- Create POS Transactions table (for multi-item sales)
CREATE TABLE IF NOT EXISTS pos_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_number text UNIQUE NOT NULL,
  cashier_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  subtotal decimal(10, 2) NOT NULL DEFAULT 0,
  tax_amount decimal(10, 2) NOT NULL DEFAULT 0,
  discount_amount decimal(10, 2) NOT NULL DEFAULT 0,
  total_amount decimal(10, 2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'credit_card', 'debit_card', 'mobile_pay')),
  amount_paid decimal(10, 2) NOT NULL DEFAULT 0,
  change_given decimal(10, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create POS Transaction Items table (individual items in a transaction)
CREATE TABLE IF NOT EXISTS pos_transaction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES pos_transactions(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal(10, 2) NOT NULL,
  discount_amount decimal(10, 2) DEFAULT 0,
  line_total decimal(10, 2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add barcode field to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode text UNIQUE;

-- Create indexes for POS performance
CREATE INDEX IF NOT EXISTS idx_pos_transactions_cashier ON pos_transactions(cashier_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_customer ON pos_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_date ON pos_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_status ON pos_transactions(status);
CREATE INDEX IF NOT EXISTS idx_pos_transaction_items_transaction ON pos_transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_pos_transaction_items_product ON pos_transaction_items(product_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

-- Enable RLS for POS tables
ALTER TABLE pos_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_transaction_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for POS Transactions
CREATE POLICY "Authenticated users can view pos transactions"
  ON pos_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert pos transactions"
  ON pos_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update pos transactions"
  ON pos_transactions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for POS Transaction Items
CREATE POLICY "Authenticated users can view pos transaction items"
  ON pos_transaction_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert pos transaction items"
  ON pos_transaction_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to generate transaction number
CREATE OR REPLACE FUNCTION generate_transaction_number()
RETURNS text AS $$
BEGIN
  RETURN 'TXN-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(EXTRACT(EPOCH FROM now())::text, 10, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to update stock and create sales record when POS transaction completes
CREATE OR REPLACE FUNCTION process_pos_transaction()
RETURNS TRIGGER AS $$
DECLARE
  item_rec RECORD;
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Update completed timestamp
    NEW.completed_at = now();
    
    -- Process each item in the transaction
    FOR item_rec IN 
      SELECT pti.product_id, pti.quantity, pti.unit_price, pti.line_total
      FROM pos_transaction_items pti 
      WHERE pti.transaction_id = NEW.id
    LOOP
      -- Update product stock
      UPDATE products
      SET current_stock = current_stock - item_rec.quantity,
          updated_at = now()
      WHERE id = item_rec.product_id;
      
      -- Create individual sale record for reporting
      INSERT INTO sales (
        product_id, 
        customer_id, 
        quantity, 
        unit_price, 
        total_amount, 
        sale_date, 
        payment_method, 
        status,
        notes
      ) VALUES (
        item_rec.product_id,
        NEW.customer_id,
        item_rec.quantity,
        item_rec.unit_price,
        item_rec.line_total,
        NEW.created_at,
        NEW.payment_method,
        'completed',
        'POS Transaction: ' || NEW.transaction_number
      );
      
      -- Create stock movement record
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
        item_rec.product_id,
        'sale',
        -item_rec.quantity,
        current_stock + item_rec.quantity,
        current_stock,
        NEW.id,
        'POS sale - Transaction: ' || NEW.transaction_number
      FROM products
      WHERE id = item_rec.product_id;
    END LOOP;
    
    -- Update customer total purchases if customer exists
    IF NEW.customer_id IS NOT NULL THEN
      UPDATE customers
      SET total_purchases = total_purchases + NEW.total_amount
      WHERE id = NEW.customer_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for POS transaction processing
CREATE TRIGGER trigger_process_pos_transaction
  BEFORE UPDATE ON pos_transactions
  FOR EACH ROW
  EXECUTE FUNCTION process_pos_transaction();

-- Function to calculate transaction totals
CREATE OR REPLACE FUNCTION calculate_pos_totals()
RETURNS TRIGGER AS $$
DECLARE
  transaction_subtotal decimal(10, 2);
  transaction_discount decimal(10, 2);
  tax_rate decimal(5, 4) := 0.0875; -- 8.75% tax rate (adjust as needed)
BEGIN
  -- Calculate subtotal from all items
  SELECT 
    COALESCE(SUM(line_total), 0),
    COALESCE(SUM(discount_amount), 0)
  INTO transaction_subtotal, transaction_discount
  FROM pos_transaction_items 
  WHERE transaction_id = COALESCE(NEW.transaction_id, OLD.transaction_id);
  
  -- Update transaction totals
  UPDATE pos_transactions 
  SET 
    subtotal = transaction_subtotal,
    discount_amount = transaction_discount,
    tax_amount = (transaction_subtotal - transaction_discount) * tax_rate,
    total_amount = (transaction_subtotal - transaction_discount) * (1 + tax_rate)
  WHERE id = COALESCE(NEW.transaction_id, OLD.transaction_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-calculate totals when items are added/updated/deleted
CREATE TRIGGER trigger_calculate_pos_totals_insert
  AFTER INSERT ON pos_transaction_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_pos_totals();

CREATE TRIGGER trigger_calculate_pos_totals_update
  AFTER UPDATE ON pos_transaction_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_pos_totals();

CREATE TRIGGER trigger_calculate_pos_totals_delete
  AFTER DELETE ON pos_transaction_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_pos_totals();