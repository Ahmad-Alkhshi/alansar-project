# دليل التحويل إلى Express + Supabase

## ✅ تم إنشاء Backend منفصل

### البنية الجديدة:
```
server/
├── src/
│   ├── config/
│   │   ├── supabase.js       # Supabase Client
│   │   └── margin-logic.js   # منطق الهامش
│   ├── controllers/
│   │   ├── products.js
│   │   ├── cart.js
│   │   ├── orders.js
│   │   └── recipients.js
│   ├── routes/
│   │   ├── products.js
│   │   ├── cart.js
│   │   ├── orders.js
│   │   └── recipients.js
│   └── index.js              # Express Server
├── .env
├── package.json
├── supabase-schema.sql       # SQL Schema
└── README.md
```

## خطوات الإعداد:

### 1. إعداد Supabase

1. اذهب إلى: https://supabase.com
2. سجل دخول بحسابك
3. أنشئ مشروع جديد أو استخدم المشروع الموجود
4. اذهب إلى **SQL Editor**
5. انسخ محتوى ملف `server/supabase-schema.sql` ونفذه
6. اذهب إلى **Settings → API**
7. انسخ:
   - Project URL
   - anon/public key

### 2. إعداد Backend

```bash
cd server
npm install
```

عدل ملف `server/.env`:
```env
PORT=5000
SUPABASE_URL=https://znaoecfhzkbdgjshhola.supabase.co
SUPABASE_KEY=your-anon-key-here
JWT_SECRET=alansar-secret-key-2024
ADMIN_EMAIL=admin@alansar.org
ADMIN_PASSWORD=admin123
```

شغل الـ server:
```bash
npm run dev
```

### 3. إعداد Frontend (Next.js)

في المجلد الرئيسي، أنشئ ملف `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 4. تشغيل المشروع

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

## الفرق بين القديم والجديد:

### القديم (Next.js + Prisma):
- ❌ Next.js API Routes
- ❌ Prisma ORM
- ❌ PostgreSQL مباشر

### الجديد (Next.js + Express + Supabase):
- ✅ Express Backend منفصل
- ✅ Supabase Client
- ✅ PostgreSQL مُدار من Supabase
- ✅ سهولة النشر
- ✅ نفس التقنيات من مشروعك السابق

## النشر:

### Backend على Vercel:
```bash
cd server
vercel
```

### Frontend على Vercel:
```bash
vercel
```

عدل `NEXT_PUBLIC_API_URL` في Vercel Environment Variables.

## ملاحظات:

- الـ Frontend لم يتغير (Next.js كما هو)
- فقط الـ Backend تم فصله وتحويله لـ Express
- استخدام Supabase بدل Prisma
- نفس المنطق والوظائف
