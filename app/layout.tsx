import type { Metadata } from 'next'
import { Cairo } from 'next/font/google'
import './globals.css'

const cairo = Cairo({ subsets: ['arabic'] })

export const metadata: Metadata = {
  title: 'نظام توزيع السلات الغذائية',
  description: 'نظام إلكتروني لإدارة توزيع السلات الغذائية',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className={cairo.className}>{children}</body>
    </html>
  )
}
