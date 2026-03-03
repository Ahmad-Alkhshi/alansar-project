-- Clean all item statuses for orders that are not completed
-- This will reset all pending/in_progress orders to fresh state

-- Reset all order items for non-completed orders
UPDATE order_items
SET 
  warehouse_status = 'pending',
  warehouse_notes = NULL
WHERE order_id IN (
  SELECT id 
  FROM orders 
  WHERE warehouse_status != 'completed'
);

-- Verify the cleanup
SELECT 
  o.warehouse_status as order_status,
  COUNT(DISTINCT oi.order_id) as orders_count,
  COUNT(oi.id) as items_count,
  COUNT(CASE WHEN oi.warehouse_status = 'pending' THEN 1 END) as pending_items,
  COUNT(CASE WHEN oi.warehouse_status = 'checked' THEN 1 END) as checked_items,
  COUNT(CASE WHEN oi.warehouse_status = 'issue' THEN 1 END) as issue_items
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
GROUP BY o.warehouse_status;
