-- Add max_quantity column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS max_quantity INTEGER DEFAULT 10;

-- Update existing products to have default max_quantity
UPDATE products 
SET max_quantity = 10 
WHERE max_quantity IS NULL;
