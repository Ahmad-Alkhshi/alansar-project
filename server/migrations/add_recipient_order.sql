-- Add recipient_order field to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS recipient_order INTEGER DEFAULT 999;

-- Create index for faster sorting
CREATE INDEX IF NOT EXISTS idx_products_recipient_order ON products(recipient_order);

-- Initialize recipient_order with current display_order values
UPDATE products 
SET recipient_order = display_order 
WHERE recipient_order = 999;
