-- Add unit and unit_weight fields to products table
-- unit: description of the unit (e.g., "25 ظرف", "1 لتر", "1 كيلو")
-- unit_weight: weight per unit in grams (e.g., 100 for tea bags, 800 for oil, 1000 for 1kg items)

ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(255) DEFAULT '1 كيلو';
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_weight INTEGER DEFAULT 1000;

COMMENT ON COLUMN products.unit IS 'Unit description (e.g., "25 ظرف", "1 لتر", "1 كيلو")';
COMMENT ON COLUMN products.unit_weight IS 'Weight per unit in grams (100 = 100g, 800 = 800g, 1000 = 1kg)';

-- Update existing products with default values
UPDATE products SET unit = '1 كيلو' WHERE unit IS NULL;
UPDATE products SET unit_weight = 1000 WHERE unit_weight IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_products_unit_weight ON products(unit_weight);
