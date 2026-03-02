# نظام إدارة عمال المستودع

## الملفات المضافة/المعدلة

### Backend (Server)
1. **server/migrations/add_workers_table.sql** - Migration لإضافة جدول العمال
2. **server/src/routes/workers.js** - API endpoints لإدارة العمال
3. **server/src/index.js** - إضافة workers routes
4. **server/src/routes/warehouse.js** - تحديث endpoint confirm لحفظ معلومات العامل
5. **prisma/schema.prisma** - إضافة Worker model وربطه مع Orders

### Frontend
1. **app/admin/workers/page.tsx** - صفحة إدارة العمال في الآدمين
2. **app/warehouse/[token]/page.tsx** - تحديث صفحة المستودع لعرض معلومات العامل
3. **app/admin/orders/page.tsx** - إضافة عرض اسم العامل ورقم السلة
4. **components/AdminSidebar.tsx** - إضافة رابط صفحة العمال

## المميزات الجديدة

### 1. إدارة العمال (Admin)
- إضافة عامل جديد (اسم، رقم واتساب، ملاحظات)
- كل عامل يحصل على token فريد تلقائياً
- عرض عدد السلات المجهزة لكل عامل
- تعديل بيانات العامل
- تفعيل/تعطيل حساب العامل
- حذف العامل
- زر "واتساب" يفتح محادثة مع العامل ويرسل له الرابط الخاص
- زر "نسخ" لنسخ رابط العامل

### 2. صفحة العامل
- رابط خاص لكل عامل: `/warehouse/[token]`
- عرض اسم العامل في الترويسة
- عرض "إنجازي: X سلة" (عدد السلات المجهزة)
- التحقق من صلاحية الرابط
- منع الدخول للحسابات المعطلة

### 3. تتبع المسؤولية
- كل طلب مكتمل يُربط بالعامل الذي جهزه
- عرض اسم العامل في صفحة الطلبات (Admin)
- عرض رقم السلة مع كل طلب مكتمل

## API Endpoints الجديدة

### Workers Management
- `GET /api/workers` - جلب جميع العمال
- `GET /api/workers/token/:token` - جلب معلومات عامل بواسطة token
- `GET /api/workers/:workerId/stats` - جلب إحصائيات العامل (عدد السلات)
- `POST /api/workers` - إضافة عامل جديد
- `PUT /api/workers/:workerId` - تحديث بيانات عامل
- `DELETE /api/workers/:workerId` - حذف عامل

### Updated Endpoints
- `POST /api/warehouse/orders/:orderId/confirm` - الآن يقبل workerId و workerName

## Database Schema

### جدول workers
```sql
- id (TEXT, PRIMARY KEY)
- name (TEXT, NOT NULL)
- phone (TEXT, UNIQUE, NOT NULL)
- token (TEXT, UNIQUE, NOT NULL)
- notes (TEXT, NULLABLE)
- is_active (BOOLEAN, DEFAULT true)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### تحديثات جدول orders
```sql
- worker_id (TEXT, NULLABLE) - معرف العامل
- worker_name (TEXT, NULLABLE) - اسم العامل (للعرض السريع)
```

## خطوات التشغيل

### 1. تشغيل Migration
افتح Supabase Dashboard → SQL Editor وشغل:
```sql
-- محتوى ملف server/migrations/add_workers_table.sql
```

### 2. تحديث Prisma (اختياري)
```bash
cd server
npx prisma generate
```

### 3. إعادة تشغيل السيرفر
```bash
cd server
npm run dev
```

### 4. اختبار النظام
1. افتح `/admin/workers`
2. أضف عامل جديد
3. اضغط "واتساب" لإرسال الرابط
4. افتح الرابط الخاص بالعامل
5. جهز سلة واحدة
6. تحقق من تحديث العداد "إنجازي"
7. تحقق من ظهور اسم العامل في صفحة الطلبات

## سير العمل

1. **الآدمن يضيف عامل**:
   - يدخل الاسم ورقم الواتساب
   - النظام يولد token فريد تلقائياً
   - يضغط "واتساب" لإرسال الرابط للعامل

2. **العامل يفتح الرابط**:
   - النظام يتحقق من صلاحية الرابط
   - يعرض اسم العامل وعدد السلات المجهزة
   - يبدأ بتجهيز الطلبات

3. **عند إتمام طلب**:
   - النظام يحفظ معرف العامل مع الطلب
   - يزيد عداد "إنجازي" للعامل
   - يظهر اسم العامل في صفحة الطلبات (Admin)

## الفوائد

✅ حصر المسؤولية: معرفة من جهز كل سلة
✅ تتبع الإنجاز: عدد السلات لكل عامل
✅ أمان: كل عامل له رابط خاص
✅ سهولة الإدارة: تفعيل/تعطيل الحسابات
✅ تواصل سريع: زر واتساب مباشر

## ملاحظات

- Token العامل يُولد تلقائياً ولا يمكن تغييره
- حذف عامل لا يحذف السلات التي جهزها
- تعطيل حساب عامل يمنعه من الدخول للرابط
- رقم الهاتف يجب أن يكون فريد (عامل واحد لكل رقم)
