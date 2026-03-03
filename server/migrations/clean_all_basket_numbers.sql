-- Clean all basket numbers except completed orders
-- This will reset the basket numbering system

-- Option 1: Keep only completed orders' basket numbers
UPDATE orders 
SET basket_number = NULL, 
    basket_number_reserved = NULL
WHERE warehouse_status != 'completed';

-- Option 2: If you want to reset EVERYTHING (including completed orders)
-- Uncomment the line below to reset all basket numbers
-- UPDATE orders SET basket_number = NULL, basket_number_reserved = NULL;

-- Verify the cleanup
SELECT 
  warehouse_status, 
  COUNT(*) as count,
  MIN(basket_number) as min_basket,
  MAX(basket_number) as max_basket
FROM orders 
WHERE basket_number IS NOT NULL
GROUP BY warehouse_status;
