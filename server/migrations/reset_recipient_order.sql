-- Reset recipient_order to be REVERSE of display_order
-- This will make it very obvious that the two orders are different

-- First, set recipient_order to the reverse of display_order
UPDATE products
SET recipient_order = (
  SELECT MAX(display_order) FROM products WHERE is_active = true
) - display_order + (
  SELECT MIN(display_order) FROM products WHERE is_active = true
)
WHERE is_active = true;

-- For inactive products, keep them at the end
UPDATE products
SET recipient_order = 999
WHERE is_active = false;

-- Verify the change
SELECT name, display_order, recipient_order 
FROM products 
WHERE is_active = true 
ORDER BY display_order;

