-- Fix completed orders without basket numbers
-- These orders should be reset to pending or assigned proper basket numbers

-- Option 1: Reset completed orders without basket_number to pending
-- This allows them to be re-prepared with proper basket numbers
UPDATE orders 
SET 
  warehouse_status = 'pending',
  warehouse_locked_by = NULL,
  warehouse_locked_at = NULL,
  worker_id = NULL,
  worker_name = NULL
WHERE warehouse_status = 'completed' 
  AND basket_number IS NULL;

-- Option 2: If you want to assign sequential basket numbers to these orders
-- Uncomment the following lines:
/*
WITH numbered_orders AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY created_at) + 
    (SELECT COALESCE(MAX(basket_number), 0) FROM orders WHERE basket_number IS NOT NULL) as new_basket_number
  FROM orders
  WHERE warehouse_status = 'completed' AND basket_number IS NULL
)
UPDATE orders o
SET basket_number = no.new_basket_number
FROM numbered_orders no
WHERE o.id = no.id;
*/

-- Verify the fix
SELECT 
  warehouse_status,
  COUNT(*) as count,
  COUNT(basket_number) as with_basket_number,
  COUNT(*) - COUNT(basket_number) as without_basket_number
FROM orders
GROUP BY warehouse_status
ORDER BY warehouse_status;
