-- Manual fix for Roberto Albert's customer lifetime value
-- Run this in Supabase SQL Editor

-- First, fix the trigger function to handle discounts properly
CREATE OR REPLACE FUNCTION update_customer_purchases()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.customer_id IS NOT NULL THEN
    -- Calculate final amount after discount
    DECLARE
      final_amount DECIMAL(12,2);
    BEGIN
      final_amount := NEW.total_amount - COALESCE(NEW.discount_amount, 0);
      
      UPDATE customers
      SET total_purchases = total_purchases + final_amount
      WHERE id = NEW.customer_id;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update Roberto Albert's total purchases based on actual sales
UPDATE customers 
SET total_purchases = (
  SELECT COALESCE(SUM(total_amount - COALESCE(discount_amount, 0)), 0)
  FROM sales 
  WHERE customer_id = customers.id AND status = 'completed'
)
WHERE name ILIKE '%Roberto Albert%';