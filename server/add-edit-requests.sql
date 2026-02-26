-- إضافة عمود can_edit لجدول orders
ALTER TABLE orders ADD COLUMN can_edit BOOLEAN DEFAULT TRUE;

-- إنشاء جدول طلبات التعديل
CREATE TABLE edit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- إنشاء index
CREATE INDEX idx_edit_requests_order ON edit_requests(order_id);
CREATE INDEX idx_edit_requests_status ON edit_requests(status);
