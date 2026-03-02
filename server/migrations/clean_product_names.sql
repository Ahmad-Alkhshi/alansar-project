-- Clean product names by removing the quantity part (e.g., "رز - 1 كيلو" becomes "رز")
-- This migration extracts the product name before the " - " separator

UPDATE products 
SET name = SPLIT_PART(name, ' - ', 1)
WHERE name LIKE '% - %';

-- If the above doesn't work in your PostgreSQL version, use this alternative:
-- UPDATE products 
-- SET name = SUBSTRING(name FROM 1 FOR POSITION(' - ' IN name) - 1)
-- WHERE name LIKE '% - %';
