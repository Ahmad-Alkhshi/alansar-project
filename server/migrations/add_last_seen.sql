-- Add last_seen column to recipients table
ALTER TABLE recipients ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_recipients_last_seen ON recipients(last_seen);
