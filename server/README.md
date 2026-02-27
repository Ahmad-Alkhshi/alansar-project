# Alansar Charity - Express Backend

## التثبيت

```bash
cd server
npm install
```

## إعداد Supabase

1. اذهب إلى: https://supabase.com
2. أنشئ مشروع جديد
3. في SQL Editor، نفذ محتوى ملف `supabase-schema.sql`
4. انسخ الـ URL والـ anon key من Settings → API

## إعداد .env

```env
PORT=5000
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-anon-key
JWT_SECRET=alansar-secret-key-2024
ADMIN_EMAIL=admin@alansar.org
ADMIN_PASSWORD=admin123
```

## التشغيل

```bash
npm run dev
```

Server سيعمل على: `http://localhost:5000`

## API Endpoints

### Products
- `GET /api/products` - جلب جميع المواد
- `POST /api/products` - إضافة منتج
- `PUT /api/products/:id` - تحديث منتج
- `DELETE /api/products/:id` - حذف منتج

### Cart
- `GET /api/cart?token=xxx` - جلب السلة
- `POST /api/cart` - إضافة منتج للسلة
- `DELETE /api/cart` - حذف منتج من السلة

### Orders
- `POST /api/orders` - تأكيد الطلب
- `GET /api/orders` - جلب جميع الطلبات

### Recipients
- `POST /api/recipients` - إضافة مستفيد
- `GET /api/recipients` - جلب جميع المستفيدين

## النشر على Vercel

```bash
npm install -g vercel
vercel
```
