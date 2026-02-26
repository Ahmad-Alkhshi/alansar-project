-- جدول السلال الافتراضية
CREATE TABLE default_baskets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  basket_value INTEGER NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- جدول منتجات السلال الافتراضية
CREATE TABLE default_basket_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  basket_id UUID NOT NULL REFERENCES default_baskets(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(basket_id, product_id)
);

-- إنشاء indexes
CREATE INDEX idx_default_baskets_value ON default_baskets(basket_value);
CREATE INDEX idx_default_basket_items_basket ON default_basket_items(basket_id);
