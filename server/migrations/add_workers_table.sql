-- Create workers table for warehouse worker management
CREATE TABLE IF NOT EXISTS workers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL UNIQUE,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add worker_id to orders table to track who prepared each order
ALTER TABLE orders ADD COLUMN IF NOT EXISTS worker_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS worker_name TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_worker_id ON orders(worker_id);
CREATE INDEX IF NOT EXISTS idx_workers_token ON workers(token);
CREATE INDEX IF NOT EXISTS idx_workers_is_active ON workers(is_active);

-- Add foreign key constraint (optional, can be removed if you want flexibility)
-- ALTER TABLE orders ADD CONSTRAINT fk_orders_worker 
--   FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE SET NULL;
