-- Update purchase orders table for the new workflow
ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_check;
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_status_check 
  CHECK (status IN ('pending', 'order_sent', 'in_transit', 'restocked', 'supplier_unavailable'));

-- Function to automatically restock products when lead time expires
CREATE OR REPLACE FUNCTION auto_restock_products()
RETURNS void AS $$
BEGIN
  -- Update in_transit orders to restocked when expected delivery date has passed
  UPDATE purchase_orders 
  SET 
    status = 'restocked',
    actual_delivery_date = now(),
    updated_at = now()
  WHERE 
    status = 'in_transit' 
    AND expected_delivery_date <= now();
    
  -- Update product stock for restocked orders
  UPDATE products 
  SET 
    current_stock = current_stock + po.quantity,
    updated_at = now()
  FROM purchase_orders po
  WHERE 
    products.id = po.product_id 
    AND po.status = 'restocked' 
    AND po.actual_delivery_date >= now() - interval '1 minute';
    
  -- Create stock movement records for restocked orders
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
    'Automatic restock from supplier delivery'
  FROM purchase_orders po
  JOIN products p ON p.id = po.product_id
  WHERE 
    po.status = 'restocked' 
    AND po.actual_delivery_date >= now() - interval '1 minute';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;