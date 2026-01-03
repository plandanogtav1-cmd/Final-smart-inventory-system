-- Add test purchase orders with delivery dates for notification testing
DO $$
DECLARE
  supplier_id uuid;
  product_id uuid;
BEGIN
  -- Get a supplier ID
  SELECT id INTO supplier_id FROM suppliers LIMIT 1;
  
  -- Get some product IDs
  SELECT id INTO product_id FROM products WHERE name LIKE '%Tire%' LIMIT 1;
  
  -- Insert test purchase orders with different delivery dates
  INSERT INTO purchase_orders (
    supplier_id, 
    product_id, 
    quantity, 
    unit_cost, 
    total_cost, 
    status, 
    expected_delivery_date,
    notes
  ) VALUES
  -- Order arriving today
  (
    supplier_id,
    product_id,
    10,
    2500.00,
    25000.00,
    'confirmed',
    CURRENT_DATE,
    'Test order arriving today'
  ),
  -- Order arriving tomorrow  
  (
    supplier_id,
    (SELECT id FROM products WHERE name LIKE '%Brake%' LIMIT 1),
    5,
    800.00,
    4000.00,
    'in_transit',
    CURRENT_DATE + INTERVAL '1 day',
    'Test order arriving tomorrow'
  ),
  -- Order arriving in 2 days
  (
    supplier_id,
    (SELECT id FROM products WHERE name LIKE '%Oil%' LIMIT 1),
    20,
    500.00,
    10000.00,
    'confirmed',
    CURRENT_DATE + INTERVAL '2 days',
    'Test order arriving in 2 days'
  ),
  -- Order arriving in 3 days
  (
    supplier_id,
    (SELECT id FROM products WHERE name LIKE '%Filter%' LIMIT 1),
    15,
    250.00,
    3750.00,
    'pending',
    CURRENT_DATE + INTERVAL '3 days',
    'Test order arriving in 3 days'
  );
END $$;