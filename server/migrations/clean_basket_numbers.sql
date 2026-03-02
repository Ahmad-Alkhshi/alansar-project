-- Clean old basket numbers from previous tests
-- Reset all basket numbers to start fresh

UPDATE orders 
SET basket_number = NULL, 
    basket_number_reserved = NULL
WHERE basket_number IS NOT NULL;

-- This will reset the basket numbering system to start from 1
