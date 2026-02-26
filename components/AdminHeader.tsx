'use client'

import { useRouter } from 'next/navigation'

export default function AdminHeader({ title }: { title: string }) {
  const router = useRouter()

  function handleLogout() {
    localStorage.removeItem('adminToken')
    router.push('/admin/login')
  }

  return (
    <div className="bg-white shadow-md p-6 flex justify-between items-center" dir="rtl">
      <h1 className="text-3xl font-bold text-primary">{title}</h1>
      <button
        onClick={handleLogout}
        className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition flex items-center gap-2"
      >
        <span>🚪</span>
        <span>تسجيل خروج</span>
      </button>
    </div>
  )
}
