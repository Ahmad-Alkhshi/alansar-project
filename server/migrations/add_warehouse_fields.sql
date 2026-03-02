-- Add warehouse fields to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS warehouse_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS warehouse_notes TEXT,
ADD COLUMN IF NOT EXISTS warehouse_locked_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS warehouse_locked_at TIMESTAMP;

-- Add warehouse fields to order_items table
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS warehouse_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS warehouse_notes TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_orders_warehouse_status ON orders(warehouse_status);
CREATE INDEX IF NOT EXISTS idx_order_items_warehouse_status ON order_items(warehouse_status);
