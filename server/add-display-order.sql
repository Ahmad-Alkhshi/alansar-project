-- إضافة حقل display_order لجدول products
ALTER TABLE products ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- تحديث الترتيب الحالي بناءً على الاسم
UPDATE products SET display_order = row_number FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name) as row_number
  FROM products
) AS numbered
WHERE products.id = numbered.id;
