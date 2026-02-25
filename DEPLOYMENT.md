# دليل النشر على Vercel + Neon

## الخطوة 1: إعداد قاعدة البيانات على Neon

### 1.1 إنشاء حساب
1. اذهب إلى: https://neon.tech
2. سجل دخول بحساب GitHub أو Google
3. اختر الخطة المجانية (Free Tier)

### 1.2 إنشاء قاعدة بيانات
1. اضغط "Create Project"
2. اختر اسم للمشروع: `alansar-charity`
3. اختر المنطقة الأقرب (Europe أو US)
4. اضغط "Create Project"

### 1.3 الحصول على رابط الاتصال
1. بعد إنشاء المشروع، ستجد `Connection String`
2. انسخ الرابط الذي يبدأ بـ `postgresql://`
3. احتفظ به للخطوة التالية

مثال:
```
postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
```

---

## الخطوة 2: النشر على Vercel

### 2.1 إنشاء حساب Vercel
1. اذهب إلى: https://vercel.com
2. سجل دخول بحساب GitHub
3. اربط حساب GitHub الخاص بك

### 2.2 رفع المشروع إلى GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/alansar-charity.git
git push -u origin main
```

### 2.3 استيراد المشروع في Vercel
1. في لوحة تحكم Vercel، اضغط "Add New Project"
2. اختر المشروع من GitHub
3. اضغط "Import"

### 2.4 إضافة متغيرات البيئة
في صفحة الإعدادات، أضف:

```
DATABASE_URL = postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
JWT_SECRET = your-random-secret-key-here
ADMIN_EMAIL = admin@alansar.org
ADMIN_PASSWORD = your-secure-password
```

### 2.5 النشر
1. اضغط "Deploy"
2. انتظر حتى ينتهي النشر (2-3 دقائق)
3. ستحصل على رابط مثل: `https://alansar-charity.vercel.app`

---

## الخطوة 3: تشغيل Migrations

### 3.1 تثبيت Vercel CLI
```bash
npm install -g vercel
```

### 3.2 تسجيل الدخول
```bash
vercel login
```

### 3.3 ربط المشروع
```bash
vercel link
```

### 3.4 سحب متغيرات البيئة
```bash
vercel env pull .env.local
```

### 3.5 تشغيل Migrations
```bash
npx prisma migrate deploy
```

### 3.6 إضافة البيانات التجريبية (اختياري)
```bash
npx tsx prisma/seed.ts
```

---

## الخطوة 4: التحقق من النشر

1. افتح الرابط: `https://your-project.vercel.app`
2. تأكد من ظهور الصفحة الرئيسية
3. اذهب إلى: `/admin` للوحة التحكم
4. جرب إضافة منتج ومستفيد

---

## نصائح مهمة

### الأمان
- ✅ غير `JWT_SECRET` إلى قيمة عشوائية قوية
- ✅ غير كلمة مرور المدير الافتراضية
- ✅ لا تشارك متغيرات البيئة مع أحد

### الأداء
- ✅ Vercel تدعم حتى 100GB bandwidth مجاناً
- ✅ Neon تدعم حتى 512MB قاعدة بيانات مجاناً
- ✅ كافي لـ 500 مستفيد بسهولة

### النسخ الاحتياطي
- ✅ Neon تحفظ نسخ احتياطية تلقائياً
- ✅ يمكنك تصدير البيانات من لوحة Neon

---

## استكشاف الأخطاء

### خطأ في الاتصال بقاعدة البيانات
- تأكد من صحة `DATABASE_URL`
- تأكد من إضافة `?sslmode=require` في نهاية الرابط

### خطأ في Migrations
```bash
npx prisma migrate reset
npx prisma migrate deploy
```

### خطأ في البناء على Vercel
- تحقق من Logs في لوحة Vercel
- تأكد من إضافة جميع متغيرات البيئة

---

## الدعم

إذا واجهت أي مشكلة:
1. راجع Logs في Vercel
2. راجع Logs في Neon
3. تواصل مع فريق التطوير

---

## التكلفة

- **Vercel Free**: 100GB bandwidth/شهر
- **Neon Free**: 512MB قاعدة بيانات
- **التكلفة الإجمالية**: 0$ شهرياً ✅

مناسب تماماً لـ 500 مستفيد!
