-- Fix ALL customers' total_purchases and disable conflicting trigger
-- Run this in Supabase SQL Editor

-- Disable the trigger that's causing double updates
DROP TRIGGER IF EXISTS trigger_update_customer_purchases ON sales;

-- Recalculate ALL customers' correct totals based on actual sales
UPDATE customers 
SET total_purchases = (
  SELECT COALESCE(SUM(total_amount), 0)
  FROM sales 
  WHERE customer_id = customers.id AND status = 'completed'
);

-- Check the results for all customers with sales
SELECT name, total_purchases, 
       (SELECT COUNT(*) FROM sales WHERE customer_id = customers.id AND status = 'completed') as actual_transactions
FROM customers 
WHERE id IN (SELECT DISTINCT customer_id FROM sales WHERE customer_id IS NOT NULL)
ORDER BY total_purchases DESC;