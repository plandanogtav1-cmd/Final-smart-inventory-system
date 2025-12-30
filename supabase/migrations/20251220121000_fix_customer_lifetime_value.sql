-- Fix customer lifetime value calculation to account for discounts
-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS trigger_update_customer_purchases ON sales;
DROP FUNCTION IF EXISTS update_customer_purchases();

-- Create updated function that accounts for discounts
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

-- Recreate the trigger
CREATE TRIGGER trigger_update_customer_purchases
AFTER INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION update_customer_purchases();

-- Update existing customer Roberto Albert's total purchases
-- First, get the customer ID
DO $$
DECLARE
    customer_uuid UUID;
    total_sales DECIMAL(12,2) := 0;
BEGIN
    -- Find Roberto Albert's customer ID
    SELECT id INTO customer_uuid 
    FROM customers 
    WHERE name ILIKE '%Roberto Albert%' 
    LIMIT 1;
    
    IF customer_uuid IS NOT NULL THEN
        -- Calculate total sales for this customer (accounting for discounts)
        SELECT COALESCE(SUM(total_amount - COALESCE(discount_amount, 0)), 0) 
        INTO total_sales
        FROM sales 
        WHERE customer_id = customer_uuid AND status = 'completed';
        
        -- Update customer's total purchases
        UPDATE customers 
        SET total_purchases = total_sales 
        WHERE id = customer_uuid;
    END IF;
END $$;