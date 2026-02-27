'use client'

import Link from 'next/link'

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-primary text-white py-6 px-4 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold">لوحة التحكم الإدارية</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/admin/products">
            <div className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition cursor-pointer">
              <div className="text-5xl mb-4 text-primary">📦</div>
              <h2 className="text-2xl font-bold mb-2">المواد</h2>
              <p className="text-gray-600">إدارة المواد والمخزون</p>
            </div>
          </Link>

          <Link href="/admin/recipients">
            <div className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition cursor-pointer">
              <div className="text-5xl mb-4 text-primary">👥</div>
              <h2 className="text-2xl font-bold mb-2">المستفيدين</h2>
              <p className="text-gray-600">إدارة المستفيدين والروابط</p>
            </div>
          </Link>

          <Link href="/admin/orders">
            <div className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition cursor-pointer">
              <div className="text-5xl mb-4 text-primary">📋</div>
              <h2 className="text-2xl font-bold mb-2">الطلبات</h2>
              <p className="text-gray-600">عرض وإدارة الطلبات</p>
            </div>
          </Link>

          <Link href="/admin/reports">
            <div className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition cursor-pointer">
              <div className="text-5xl mb-4 text-primary">📊</div>
              <h2 className="text-2xl font-bold mb-2">التقارير</h2>
              <p className="text-gray-600">التقارير والإحصائيات</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}

