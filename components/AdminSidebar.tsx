'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const links = [
    { href: '/admin', label: 'لوحة التحكم', icon: '🏠' },
    { href: '/admin/products', label: 'المنتجات', icon: '📦' },
    { href: '/admin/recipients', label: 'المستفيدين', icon: '👥' },
    { href: '/admin/orders', label: 'الطلبات', icon: '📋' },
    { href: '/admin/reports', label: 'التقارير', icon: '📊' },
  ]

  function handleLogout() {
    localStorage.removeItem('adminToken')
    router.push('/admin/login')
  }

  return (
    <div className="w-64 bg-primary text-white min-h-screen p-6 flex flex-col" dir="rtl">
      <h2 className="text-2xl font-bold mb-8">نظام الأنصار</h2>
      
      <nav className="space-y-2 flex-1">
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 p-3 rounded-lg transition ${
              pathname === link.href
                ? 'bg-white text-primary font-bold'
                : 'hover:bg-primary-dark'
            }`}
          >
            <span className="text-2xl">{link.icon}</span>
            <span className="text-lg">{link.label}</span>
          </Link>
        ))}
      </nav>

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 p-3 rounded-lg hover:bg-red-600 transition mt-4"
      >
        <span className="text-2xl">🚪</span>
        <span className="text-lg">تسجيل خروج</span>
      </button>
    </div>
  )
}
