-- Create purchase orders table for automated restocking
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  unit_cost decimal(10,2) NOT NULL DEFAULT 0,
  total_cost decimal(12,2) NOT NULL DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'ordered', 'confirmed', 'delivered', 'cancelled', 'order_sent', 'in_transit', 'supplier_unavailable')),
  order_date timestamptz DEFAULT now(),
  expected_delivery_date timestamptz,
  actual_delivery_date timestamptz,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_product ON purchase_orders(product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_expected_delivery ON purchase_orders(expected_delivery_date);

-- Enable RLS
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view purchase orders"
  ON purchase_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert purchase orders"
  ON purchase_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update purchase orders"
  ON purchase_orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to automatically deliver orders when lead time expires
CREATE OR REPLACE FUNCTION auto_deliver_orders()
RETURNS void AS $$
BEGIN
  -- Update confirmed AND in_transit orders to delivered when expected delivery date has passed
  UPDATE purchase_orders 
  SET 
    status = 'delivered',
    actual_delivery_date = now(),
    updated_at = now()
  WHERE 
    status IN ('confirmed', 'in_transit')
    AND expected_delivery_date <= now();
    
  -- Update product stock for delivered orders
  UPDATE products 
  SET 
    current_stock = current_stock + po.quantity,
    updated_at = now()
  FROM purchase_orders po
  WHERE 
    products.id = po.product_id 
    AND po.status = 'delivered' 
    AND po.actual_delivery_date >= now() - interval '1 minute';
    
  -- Create stock movement records for delivered orders
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
    po.product_id,
    'purchase',
    po.quantity,
    p.current_stock - po.quantity,
    p.current_stock,
    po.id,
    'Automatic delivery from purchase order'
  FROM purchase_orders po
  JOIN products p ON p.id = po.product_id
  WHERE 
    po.status = 'delivered' 
    AND po.actual_delivery_date >= now() - interval '1 minute';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delay delivery for overdue orders
CREATE OR REPLACE FUNCTION delay_delivery(order_id uuid, new_delivery_date timestamptz)
RETURNS boolean AS $$
DECLARE
  rows_updated integer;
BEGIN
  -- Validate that new delivery date is in the future
  IF new_delivery_date <= now() THEN
    RETURN false;
  END IF;
  
  UPDATE purchase_orders 
  SET 
    expected_delivery_date = new_delivery_date,
    updated_at = now(),
    notes = CASE 
      WHEN notes = '' OR notes IS NULL THEN 'Delivery delayed'
      ELSE notes || '; Delivery delayed'
    END
  WHERE 
    id = order_id 
    AND status IN ('ordered', 'confirmed', 'in_transit');
    
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process deliveries and return delivery summary
CREATE OR REPLACE FUNCTION process_deliveries_with_summary()
RETURNS TABLE(
  delivered_count integer,
  delivery_details jsonb
) AS $$
DECLARE
  delivery_summary jsonb;
BEGIN
  -- Get details of orders that will be delivered
  SELECT jsonb_agg(
    jsonb_build_object(
      'product_name', p.name,
      'quantity', po.quantity,
      'supplier_name', s.name,
      'expected_date', po.expected_delivery_date
    )
  ) INTO delivery_summary
  FROM purchase_orders po
  JOIN products p ON p.id = po.product_id
  JOIN suppliers s ON s.id = po.supplier_id
  WHERE po.status IN ('confirmed', 'in_transit')
    AND po.expected_delivery_date <= now();

  -- Process the deliveries
  PERFORM auto_deliver_orders();

  -- Return summary
  RETURN QUERY SELECT 
    COALESCE(jsonb_array_length(delivery_summary), 0)::integer,
    COALESCE(delivery_summary, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to be called periodically (you can set up a cron job or call this manually)
-- This would typically be called every hour or so to check for deliveries