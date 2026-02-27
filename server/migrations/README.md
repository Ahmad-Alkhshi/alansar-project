# إضافة عمود max_quantity

## المشكلة
العمود `max_quantity` غير موجود في جدول `products` في Supabase

## الحل
1. افتح Supabase Dashboard
2. اذهب إلى SQL Editor
3. نفذ الكود التالي:

```sql
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS max_quantity INTEGER DEFAULT 10;

UPDATE products 
SET max_quantity = 10 
WHERE max_quantity IS NULL;
```

4. بعد تنفيذ الكود، جرب تحديث الحد الأقصى مرة أخرى
