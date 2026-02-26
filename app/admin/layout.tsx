'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    
    if (pathname === '/admin/login') {
      if (token) {
        router.push('/admin')
      } else {
        setIsAuthenticated(true)
        setLoading(false)
      }
    } else {
      if (!token) {
        router.push('/admin/login')
      } else {
        setIsAuthenticated(true)
        setLoading(false)
      }
    }
  }, [pathname, router])

  if (loading || !isAuthenticated) {
    return null
  }

  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  return (
    <div className="flex">
      <AdminSidebar />
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}
