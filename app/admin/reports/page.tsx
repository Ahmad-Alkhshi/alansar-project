'use client'

import { useEffect, useState } from 'react'

interface ProductSummary {
  productId: string
  productName: string
  totalQuantity: number
  unitPrice: number
  totalPrice: number
}

interface OrderItem {
  productName: string
  quantity: number
  unitPrice: number
  total: number
}

interface Order {
  orderId: string
  recipientName: string
  recipientPhone: string
  finalTotal: number
  status: string
  createdAt: string
  items: OrderItem[]
}

interface ReportData {
  totalOrders: number
  productSummary: ProductSummary[]
  orders: Order[]
}

export default function AdminReportsPage() {
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReport()
  }, [])

  async function loadReport() {
    try {
      const res = await fetch('/api/admin/reports')
      const data = await res.json()
      setReport(data)
    } catch (error) {
      alert('فشل في تحميل التقرير')
    } finally {
      setLoading(false)
    }
  }

  function exportCSV() {
    if (!report) return
    
    let csv = 'اسم المنتج,الكمية الإجمالية,سعر الوحدة,المجموع\n'
    report.productSummary.forEach(item => {
      csv += `${item.productName},${item.totalQuantity},${item.unitPrice},${item.totalPrice}\n`
    })
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'تقرير_المنتجات.csv'
    link.click()
  }

  if (loading) {
    return <div className="p-8 text-center">جاري التحميل...</div>
  }

  if (!report) {
    return <div className="p-8 text-center">لا توجد بيانات</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-primary">التقارير</h1>
          <button
            onClick={exportCSV}
            className="bg-success text-white px-6 py-3 rounded-lg hover:opacity-90"
          >
            تصدير CSV
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="text-gray-600 mb-2">إجمالي الطلبات</div>
            <div className="text-4xl font-bold text-primary">{report.totalOrders}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="text-gray-600 mb-2">إجمالي المنتجات</div>
            <div className="text-4xl font-bold text-primary">{report.productSummary.length}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="text-gray-600 mb-2">إجمالي القيمة</div>
            <div className="text-4xl font-bold text-primary">
              {report.productSummary.reduce((sum, item) => sum + item.totalPrice, 0).toLocaleString('ar-SY')} ل.س
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
          <div className="bg-primary text-white p-4">
            <h2 className="text-2xl font-bold">ملخص المنتجات المطلوبة</h2>
          </div>
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4 text-right">المنتج</th>
                <th className="p-4 text-right">الكمية الإجمالية</th>
                <th className="p-4 text-right">سعر الوحدة</th>
                <th className="p-4 text-right">المجموع</th>
              </tr>
            </thead>
            <tbody>
              {report.productSummary.map(item => (
                <tr key={item.productId} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-bold">{item.productName}</td>
                  <td className="p-4">{item.totalQuantity}</td>
                  <td className="p-4">{item.unitPrice.toLocaleString('ar-SY')} ل.س</td>
                  <td className="p-4 font-bold text-primary">{item.totalPrice.toLocaleString('ar-SY')} ل.س</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-primary text-white p-4">
            <h2 className="text-2xl font-bold">الطلبات الفردية</h2>
          </div>
          <div className="p-4 space-y-4">
            {report.orders.map(order => (
              <div key={order.orderId} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-xl font-bold">{order.recipientName}</div>
                    <div className="text-gray-600">{order.recipientPhone}</div>
                  </div>
                  <div className="text-left">
                    <div className="text-2xl font-bold text-primary">{order.finalTotal.toLocaleString('ar-SY')} ل.س</div>
                    <div className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString('ar-SY')}</div>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-right">المنتج</th>
                      <th className="p-2 text-right">الكمية</th>
                      <th className="p-2 text-right">السعر</th>
                      <th className="p-2 text-right">المجموع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-2">{item.productName}</td>
                        <td className="p-2">{item.quantity}</td>
                        <td className="p-2">{item.unitPrice.toLocaleString('ar-SY')}</td>
                        <td className="p-2">{item.total.toLocaleString('ar-SY')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
