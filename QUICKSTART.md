# البدء السريع

## 1. التثبيت

```bash
npm install
```

## 2. إعداد قاعدة البيانات

أنشئ ملف `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/alansar_charity"
JWT_SECRET="your-secret-key"
```

## 3. تشغيل Migrations

```bash
npx prisma migrate dev
```

## 4. إضافة بيانات تجريبية

```bash
npm run seed
```

سيضيف:
- 15 منتج غذائي
- 3 مستفيدين مع روابطهم
- حساب مدير (admin@alansar.org / admin123)

## 5. تشغيل المشروع

```bash
npm run dev
```

افتح: http://localhost:3000

## الروابط المهمة

- **الصفحة الرئيسية**: http://localhost:3000
- **لوحة الإدارة**: http://localhost:3000/admin
- **صفحة مستفيد**: http://localhost:3000/claim/{token}

## الخطوات التالية

1. اذهب إلى `/admin/products` لإضافة منتجات
2. اذهب إلى `/admin/recipients` لإضافة مستفيدين
3. انسخ رابط المستفيد وجربه
4. اذهب إلى `/admin/reports` لعرض التقارير

## ملاحظات

- الواجهة مصممة لكبار السن (خط كبير، أزرار واضحة)
- منطق الهامش يعمل تلقائياً
- التقارير تُحدّث فورياً
- يمكن تصدير CSV من صفحة التقارير

## للنشر

راجع ملف `DEPLOYMENT.md` للتعليمات الكاملة.
