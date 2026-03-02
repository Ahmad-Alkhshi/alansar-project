-- Add basket_number and basket_number_reserved fields to orders table
-- basket_number: the final basket number assigned when worker confirms
-- basket_number_reserved: timestamp when the number was reserved (for temporary reservation)

ALTER TABLE orders ADD COLUMN IF NOT EXISTS basket_number INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS basket_number_reserved TIMESTAMP;

COMMENT ON COLUMN orders.basket_number IS 'Basket number assigned when completing preparation';
COMMENT ON COLUMN orders.basket_number_reserved IS 'Timestamp when basket number was reserved (temporary)';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_orders_basket_number ON orders(basket_number);
CREATE INDEX IF NOT EXISTS idx_orders_basket_number_reserved ON orders(basket_number_reserved);
