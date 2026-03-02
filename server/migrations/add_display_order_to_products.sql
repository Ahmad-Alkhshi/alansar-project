-- Add display_order field to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 999;

-- Set initial order based on current order (by name or creation date)
UPDATE products 
SET display_order = (
  SELECT COUNT(*) 
  FROM products p2 
  WHERE p2.created_at <= products.created_at
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_products_display_order ON products(display_order);
