-- Function to increment customer purchases
CREATE OR REPLACE FUNCTION increment_customer_purchases(customer_id uuid, amount decimal)
RETURNS void AS $$
BEGIN
  UPDATE customers 
  SET total_purchases = total_purchases + amount
  WHERE id = customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;