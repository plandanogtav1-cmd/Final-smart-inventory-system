-- Create returns table to track returned items
CREATE TABLE IF NOT EXISTS returns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  original_sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  return_reason TEXT,
  return_status VARCHAR(20) DEFAULT 'completed' CHECK (return_status IN ('completed', 'pending', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own returns" ON returns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own returns" ON returns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own returns" ON returns
  FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_returns_user_id ON returns(user_id);
CREATE INDEX idx_returns_sale_id ON returns(original_sale_id);
CREATE INDEX idx_returns_product_id ON returns(product_id);
CREATE INDEX idx_returns_created_at ON returns(created_at);

-- Function to handle stock restoration on returns
CREATE OR REPLACE FUNCTION handle_return_stock_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Add returned quantity back to product stock
  UPDATE products 
  SET current_stock = current_stock + NEW.quantity,
      updated_at = NOW()
  WHERE id = NEW.product_id;
  
  -- Create stock movement record
  INSERT INTO stock_movements (
    user_id,
    product_id,
    movement_type,
    quantity,
    reference_type,
    reference_id,
    notes
  ) VALUES (
    NEW.user_id,
    NEW.product_id,
    'return',
    NEW.quantity,
    'return',
    NEW.id,
    'Stock returned from sale return'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for stock restoration
CREATE TRIGGER trigger_return_stock_update
  AFTER INSERT ON returns
  FOR EACH ROW
  EXECUTE FUNCTION handle_return_stock_update();

-- Function to update customer total purchases on returns
CREATE OR REPLACE FUNCTION handle_return_customer_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Subtract return amount from customer total purchases
  IF NEW.customer_id IS NOT NULL THEN
    UPDATE customers 
    SET total_purchases = GREATEST(0, total_purchases - NEW.total_amount),
        updated_at = NOW()
    WHERE id = NEW.customer_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for customer update
CREATE TRIGGER trigger_return_customer_update
  AFTER INSERT ON returns
  FOR EACH ROW
  EXECUTE FUNCTION handle_return_customer_update();