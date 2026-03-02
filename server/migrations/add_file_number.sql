-- Add file_number field to recipients table
ALTER TABLE recipients 
ADD COLUMN IF NOT EXISTS file_number VARCHAR(255) UNIQUE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_recipients_file_number ON recipients(file_number);
