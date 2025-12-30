-- Function to clean up duplicate customers
CREATE OR REPLACE FUNCTION cleanup_duplicate_customers()
RETURNS void AS $$
DECLARE
    customer_record RECORD;
    duplicate_record RECORD;
    keep_id uuid;
BEGIN
    -- Find duplicate customer names (case insensitive)
    FOR customer_record IN 
        SELECT LOWER(name) as lower_name, MIN(id) as keep_id, COUNT(*) as count
        FROM customers 
        GROUP BY LOWER(name) 
        HAVING COUNT(*) > 1
    LOOP
        keep_id := customer_record.keep_id;
        
        -- Update all sales to point to the customer we're keeping
        UPDATE sales 
        SET customer_id = keep_id 
        WHERE customer_id IN (
            SELECT id FROM customers 
            WHERE LOWER(name) = customer_record.lower_name 
            AND id != keep_id
        );
        
        -- Delete duplicate customers
        DELETE FROM customers 
        WHERE LOWER(name) = customer_record.lower_name 
        AND id != keep_id;
        
        -- Recalculate total_purchases for the kept customer
        UPDATE customers 
        SET total_purchases = (
            SELECT COALESCE(SUM(total_amount), 0) 
            FROM sales 
            WHERE customer_id = keep_id AND status = 'completed'
        )
        WHERE id = keep_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;