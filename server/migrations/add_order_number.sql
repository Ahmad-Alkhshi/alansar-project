-- Add order_number field to orders table with auto-increment
-- First, add the column
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_number SERIAL UNIQUE;

-- Update existing orders with sequential numbers
DO $$
DECLARE
  rec RECORD;
  counter INT := 1;
BEGIN
  FOR rec IN SELECT id FROM orders ORDER BY created_at ASC
  LOOP
    UPDATE orders SET order_number = counter WHERE id = rec.id;
    counter := counter + 1;
  END LOOP;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
