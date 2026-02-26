-- إضافة حقول لجدول recipients
ALTER TABLE recipients ADD COLUMN IF NOT EXISTS link_duration_days INTEGER DEFAULT 2;
ALTER TABLE recipients ADD COLUMN IF NOT EXISTS link_active BOOLEAN DEFAULT TRUE;
