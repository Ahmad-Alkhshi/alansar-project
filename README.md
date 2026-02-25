# نظام توزيع السلات الغذائية

نظام إلكتروني متكامل لإدارة توزيع السلات الغذائية للجمعيات الخيرية.

## المميزات

✅ نظام روابط خاصة لكل مستفيد  
✅ اختيار المنتجات ضمن حد مالي محدد (500,000 ل.س)  
✅ هامش استثنائي ذكي (10,000 ل.س)  
✅ واجهة مبسطة لكبار السن  
✅ لوحة تحكم إدارية شاملة  
✅ تقارير تفصيلية وإجمالية  

## التقنيات المستخدمة

- **Frontend**: Next.js 14 (App Router)
- **Backend**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Language**: TypeScript / JavaScript

## التثبيت والإعداد

### 1. إعداد Supabase

1. اذهب إلى: https://supabase.com
2. أنشئ مشروع جديد
3. في SQL Editor، نفذ محتوى ملف `server/supabase-schema.sql`
4. انسخ الـ URL والـ anon key من Settings → API

### 2. إعداد Backend

```bash
cd server
npm install
```

أنشئ ملف `server/.env`:
```env
PORT=5000
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-anon-key
JWT_SECRET=alansar-secret-key-2024
ADMIN_EMAIL=admin@alansar.org
ADMIN_PASSWORD=admin123
```

شغل الـ server:
```bash
npm run dev
```

### 3. إعداد Frontend

في المجلد الرئيسي:
```bash
npm install
```

أنشئ ملف `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

شغل الـ frontend:
```bash
npm run dev
```

## التشغيل

يجب تشغيل Backend و Frontend معاً:

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

- Backend: `http://localhost:5000`
- Frontend: `http://localhost:3000`

## البنية

```
alansar-charity/
├── server/                # Express Backend
│   ├── src/
│   │   ├── config/       # Supabase + منطق الهامش
│   │   ├── controllers/  # Products, Cart, Orders
│   │   ├── routes/       # API Routes
│   │   └── index.js      # Express Server
│   └── supabase-schema.sql
├── app/                   # Next.js Frontend
│   ├── claim/[token]/    # صفحة المستفيد
│   ├── admin/            # لوحة التحكم
│   └── page.tsx          # الصفحة الرئيسية
├── lib/
│   ├── api.ts            # API Helper
│   └── margin-logic.ts   # منطق الهامش
└── components/           # المكونات
```

## الاستخدام

### للمستفيدين
1. استخدم الرابط الخاص: `/claim/{token}`
2. اختر المنتجات المطلوبة
3. أكد الطلب

### للإدارة
1. ادخل إلى: `/admin`
2. أقسام لوحة التحكم:
   - **المنتجات**: إضافة/تعديل/حذف المنتجات
   - **المستفيدين**: إضافة مستفيدين وإنشاء روابط
   - **الطلبات**: عرض جميع الطلبات
   - **التقارير**: تقارير تفصيلية

## منطق الهامش

- **الحد الأساسي**: 500,000 ل.س
- **الهامش الاستثنائي**: 10,000 ل.س
- **القاعدة**: يُسمح بالهامش فقط إذا كان أصغر منتج في السلة أكبر من الفارق

## النشر

### Backend على Vercel
```bash
cd server
vercel
```

### Frontend على Vercel
```bash
vercel
```

عدل `NEXT_PUBLIC_API_URL` في Vercel Environment Variables.

## الأمان

✅ التحقق من Token في كل طلب  
✅ التحقق من المخزون قبل التأكيد  
✅ التحقق من الهامش في السيرفر  
✅ منع التلاعب بالأسعار  

## الدعم

للمساعدة أو الاستفسارات، تواصل مع فريق التطوير.
