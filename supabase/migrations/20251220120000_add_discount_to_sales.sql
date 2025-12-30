-- Add discount fields to sales table
ALTER TABLE sales 
ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN discount_type VARCHAR(20) DEFAULT 'none';

-- Add discount fields to pos_transactions table
ALTER TABLE pos_transactions 
ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN discount_type VARCHAR(20) DEFAULT 'none';

-- Update existing records to have default discount values
UPDATE sales SET discount_amount = 0, discount_type = 'none' WHERE discount_amount IS NULL;
UPDATE pos_transactions SET discount_amount = 0, discount_type = 'none' WHERE discount_amount IS NULL;