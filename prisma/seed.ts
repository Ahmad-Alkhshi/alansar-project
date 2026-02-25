import { PrismaClient } from '@prisma/client'
import { hashPassword, generateRecipientToken } from '../lib/auth'

const prisma = new PrismaClient()

async function main() {
  console.log('بدء إضافة البيانات التجريبية...')

  // إضافة منتجات
  const products = [
    { name: 'رز - 5 كغ', price: 45000, stock: 100, imageUrl: null },
    { name: 'سكر - 2 كغ', price: 25000, stock: 100, imageUrl: null },
    { name: 'زيت نباتي - 2 ليتر', price: 60000, stock: 80, imageUrl: null },
    { name: 'معكرونة - 1 كغ', price: 15000, stock: 150, imageUrl: null },
    { name: 'طحين - 5 كغ', price: 40000, stock: 100, imageUrl: null },
    { name: 'حمص - 1 كغ', price: 35000, stock: 80, imageUrl: null },
    { name: 'عدس - 1 كغ', price: 30000, stock: 80, imageUrl: null },
    { name: 'برغل - 1 كغ', price: 28000, stock: 90, imageUrl: null },
    { name: 'معلبات تونة - 6 علب', price: 55000, stock: 70, imageUrl: null },
    { name: 'معجون طماطم - 800 غ', price: 18000, stock: 100, imageUrl: null },
    { name: 'شاي - 500 غ', price: 22000, stock: 100, imageUrl: null },
    { name: 'سمنة - 1 كغ', price: 70000, stock: 60, imageUrl: null },
    { name: 'حليب مجفف - 900 غ', price: 48000, stock: 80, imageUrl: null },
    { name: 'جبنة بيضاء - 500 غ', price: 32000, stock: 70, imageUrl: null },
    { name: 'زيتون - 1 كغ', price: 38000, stock: 60, imageUrl: null },
  ]

  for (const product of products) {
    await prisma.product.create({ data: product })
    console.log(`✅ تم إضافة: ${product.name}`)
  }

  // إضافة مستفيدين تجريبيين
  const recipients = [
    { name: 'أحمد محمد', phone: '0912345678' },
    { name: 'فاطمة علي', phone: '0923456789' },
    { name: 'خالد حسن', phone: '0934567890' },
  ]

  for (const recipient of recipients) {
    const token = generateRecipientToken()
    await prisma.recipient.create({
      data: {
        ...recipient,
        token,
        tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })
    console.log(`✅ تم إضافة مستفيد: ${recipient.name}`)
    console.log(`   الرابط: http://localhost:3000/claim/${token}`)
  }

  // إضافة مدير
  const hashedPassword = await hashPassword('admin123')
  await prisma.admin.create({
    data: {
      email: 'admin@alansar.org',
      password: hashedPassword,
      name: 'المدير',
    },
  })
  console.log('✅ تم إضافة حساب المدير')
  console.log('   البريد: admin@alansar.org')
  console.log('   كلمة المرور: admin123')

  console.log('\n✅ تم إضافة جميع البيانات التجريبية بنجاح!')
}

main()
  .catch(e => {
    console.error('❌ خطأ:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
