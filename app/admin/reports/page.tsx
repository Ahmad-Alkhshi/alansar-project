'use client'

import { API_URL } from '@/lib/config'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import * as XLSX from 'xlsx'

interface Order {
  id: string
  final_total: number
  recipients: { name: string; phone: string }
  order_items: Array<{
    quantity: number
    unit_price: number
    products: { name: string }
  }>
}

export default function ReportsPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [recipients, setRecipients] = useState<any[]>([])
  const [defaultBaskets, setDefaultBaskets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [reportType, setReportType] = useState<'collective' | 'individual'>('collective')

  useEffect(() => {
    loadOrders()
  }, [])

  async function loadOrders() {
    try {
      const [ordersData, recipientsData, basketsData] = await Promise.all([
        api.getAllOrders(),
        api.getAllRecipients(),
        fetch(`${API_URL}/default-baskets`).then(r => r.json())
      ])
      setOrders(ordersData)
      setRecipients(recipientsData)
      setDefaultBaskets(basketsData)
    } catch (error) {
      alert('فشل في تحميل الطلبات')
    } finally {
      setLoading(false)
    }
  }

  function getCollectiveReport() {
    const productMap: { [key: string]: { name: string; unit: string; quantity: number } } = {}
    
    // من الطلبات الحقيقية
    orders.forEach(order => {
      order.order_items?.forEach(item => {
        const fullName = item.products?.name || 'منتج'
        const parts = fullName.split(' - ')
        const name = parts[0] || fullName
        const unit = parts[1] || ''
        
        const key = fullName
        if (!productMap[key]) {
          productMap[key] = { name, unit, quantity: 0 }
        }
        productMap[key].quantity += item.quantity
      })
    })
    
    // من السلال الافتراضية
    recipients.forEach(recipient => {
      const hasOrder = orders.some(o => o.recipients?.phone === recipient.phone)
      if (!hasOrder && !recipient.order_submitted) {
        const basketValue = recipient.basket_limit || 500000
        const defaultBasket = defaultBaskets.find(b => b.basket_value === basketValue)
        
        if (defaultBasket && defaultBasket.items) {
          defaultBasket.items.forEach((item: any) => {
            const fullName = item.products?.name || 'منتج'
            const parts = fullName.split(' - ')
            const name = parts[0] || fullName
            const unit = parts[1] || ''
            
            const key = fullName
            if (!productMap[key]) {
              productMap[key] = { name, unit, quantity: 0 }
            }
            productMap[key].quantity += item.quantity
          })
        }
      }
    })

    return Object.values(productMap)
  }

  function exportCollectiveToExcel() {
    const report = getCollectiveReport()
    const ws = XLSX.utils.json_to_sheet(report.map(r => ({
      'المادة': r.name,
      'الكمية': r.unit,
      'الكمية المطلوبة': r.quantity
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'التقرير الجماعي')
    XLSX.writeFile(wb, 'تقرير_جماعي.xlsx')
  }

  function exportIndividualToExcel() {
    const rows: any[] = []
    
    recipients.forEach(recipient => {
      const order = orders.find(o => o.recipients?.phone === recipient.phone)
      
      if (order) {
        order.order_items?.forEach(item => {
          rows.push({
            'رقم الملف': order.recipients?.phone,
            'المادة': item.products?.name,
            'الكمية': item.quantity
          })
        })
      } else if (!recipient.order_submitted) {
        const basketValue = recipient.basket_limit || 500000
        const defaultBasket = defaultBaskets.find(b => b.basket_value === basketValue)
        
        defaultBasket?.items?.forEach((item: any) => {
          rows.push({
            'رقم الملف': recipient.phone,
            'المادة': item.products?.name,
            'الكمية': item.quantity
          })
        })
      }
    })
    
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'التقرير الفردي')
    XLSX.writeFile(wb, 'تقرير_فردي.xlsx')
  }

  function printCollective() {
    const report = getCollectiveReport()
    const printWindow = window.open('', '', 'width=800,height=600')
    printWindow?.document.write(`
      <html dir="rtl">
        <head>
          <title>التقرير الجماعي</title>
          <style>
            body { font-family: Arial; padding: 20px; }
            h1 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: right; }
            th { background-color: #2c5f2d; color: white; }
          </style>
        </head>
        <body>
          <h1>التقرير الجماعي - المواد المطلوبة</h1>
          <table>
            <thead>
              <tr>
                <th>المادة</th>
                <th>الكمية</th>
                <th>الكمية المطلوبة</th>
              </tr>
            </thead>
            <tbody>
              ${report.map(r => `
                <tr>
                  <td>${r.name}</td>
                  <td>${r.unit}</td>
                  <td>${r.quantity}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `)
    printWindow?.document.close()
    printWindow?.print()
  }

  function printIndividual() {
    const printWindow = window.open('', '', 'width=800,height=600')
    printWindow?.document.write(`
      <html dir="rtl">
        <head>
          <title>التقرير الفردي</title>
          <style>
            body { font-family: Arial; padding: 20px; }
            h1 { text-align: center; }
            .order { margin-bottom: 30px; border: 1px solid #ddd; padding: 15px; }
            .order h3 { margin: 0 0 10px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
            th { background-color: #2c5f2d; color: white; }
          </style>
        </head>
        <body>
          <h1>التقرير الفردي - طلبات المستفيدين</h1>
          ${orders.map(order => `
            <div class="order">
              <h3>${order.recipients?.name} - ${order.recipients?.phone}</h3>
              <p><strong>المجموع:</strong> ${order.final_total?.toLocaleString('ar-SY')} </p>
              <table>
                <thead>
                  <tr>
                    <th>المادة</th>
                    <th>الكمية</th>
                    <th>السعر</th>
                  </tr>
                </thead>
                <tbody>
                  ${order.order_items?.map(item => `
                    <tr>
                      <td>${item.products?.name}</td>
                      <td>${item.quantity}</td>
                      <td>${(item.quantity * item.unit_price).toLocaleString('ar-SY')} </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `).join('')}
        </body>
      </html>
    `)
    printWindow?.document.close()
    printWindow?.print()
  }

  if (loading) {
    return <div className="p-8 text-center text-xl">جاري التحميل...</div>
  }

  const collectiveReport = getCollectiveReport()

  return (
    <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-primary mb-8">التقارير</h1>

        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setReportType('collective')}
            className={`px-6 py-3 rounded-lg font-bold ${
              reportType === 'collective'
                ? 'bg-primary text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            التقرير الجماعي
          </button>
          <button
            onClick={() => setReportType('individual')}
            className={`px-6 py-3 rounded-lg font-bold ${
              reportType === 'individual'
                ? 'bg-primary text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            التقرير الفردي
          </button>
        </div>

        {reportType === 'collective' ? (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">المواد المطلوبة للشراء</h2>
              <div className="flex gap-3">
                <button
                  onClick={exportCollectiveToExcel}
                  className="bg-success text-white px-6 py-3 rounded-lg hover:opacity-90"
                >
                  📥 تصدير Excel
                </button>
                <button
                  onClick={printCollective}
                  className="bg-primary text-white px-6 py-3 rounded-lg hover:opacity-90"
                >
                  🖨️ طباعة
                </button>
              </div>
            </div>

            <table className="w-full">
              <thead className="bg-primary text-white">
                <tr>
                  <th className="p-4 text-right">المادة</th>
                  <th className="p-4 text-right">الكمية</th>
                  <th className="p-4 text-right">الكمية المطلوبة</th>
                </tr>
              </thead>
              <tbody>
                {collectiveReport.map((item, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-4 text-lg">{item.name}</td>
                    <td className="p-4 text-lg">{item.unit}</td>
                    <td className="p-4 text-lg font-bold text-primary">{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">طلبات المستفيدين</h2>
              <div className="flex gap-3">
                <button
                  onClick={exportIndividualToExcel}
                  className="bg-success text-white px-6 py-3 rounded-lg hover:opacity-90"
                >
                  📥 تصدير Excel
                </button>
                <button
                  onClick={printIndividual}
                  className="bg-primary text-white px-6 py-3 rounded-lg hover:opacity-90"
                >
                  🖨️ طباعة
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {recipients.map((recipient, idx) => {
                const order = orders.find(o => o.recipients?.phone === recipient.phone)
                
                if (order) {
                  return (
                    <div key={order.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold">{order.recipients?.name}</h3>
                          <p className="text-gray-600">{order.recipients?.phone}</p>
                        </div>
                        <div className="text-2xl font-bold text-primary">
                          {order.final_total?.toLocaleString('ar-SY')} 
                        </div>
                      </div>
                      <div className="space-y-2">
                        {order.order_items?.map((item, idx) => (
                          <div key={idx} className="flex justify-between bg-gray-50 p-3 rounded">
                            <span>{item.products?.name}</span>
                            <span className="font-bold">الكمية: {item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                } else if (!recipient.order_submitted) {
                  const basketValue = recipient.basket_limit || 500000
                  const defaultBasket = defaultBaskets.find(b => b.basket_value === basketValue)
                  
                  return (
                    <div key={idx} className="border rounded-lg p-4 bg-yellow-50">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold">{recipient.name}</h3>
                          <p className="text-gray-600">{recipient.phone}</p>
                          <p className="text-sm text-warning font-bold mt-1">سلة افتراضية</p>
                        </div>
                        <div className="text-2xl font-bold text-primary">
                          {basketValue.toLocaleString('ar-SY')} 
                        </div>
                      </div>
                      <div className="space-y-2">
                        {defaultBasket?.items?.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between bg-white p-3 rounded">
                            <span>{item.products?.name}</span>
                            <span className="font-bold">الكمية: {item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                }
                return null
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

