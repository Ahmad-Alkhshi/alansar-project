import type { Metadata } from 'next'
import './globals.css'

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
      <body>{children}</body>
    </html>
  )
}
