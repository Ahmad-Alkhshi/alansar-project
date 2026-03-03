-- Add device_id to workers table to restrict access to one device
ALTER TABLE workers 
ADD COLUMN device_id TEXT;

-- Add index for faster lookups
CREATE INDEX idx_workers_device_id ON workers(device_id);

-- Verify the change
SELECT id, name, token, device_id, is_active 
FROM workers 
LIMIT 5;
