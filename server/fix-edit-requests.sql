-- إضافة عمود can_edit لجدول orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS can_edit BOOLEAN DEFAULT TRUE;

-- حذف الجدول القديم إذا كان موجود
DROP TABLE IF EXISTS edit_requests;

-- إنشاء جدول طلبات التعديل
CREATE TABLE edit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- إنشاء indexes
CREATE INDEX idx_edit_requests_order ON edit_requests(order_id);
CREATE INDEX idx_edit_requests_status ON edit_requests(status);
