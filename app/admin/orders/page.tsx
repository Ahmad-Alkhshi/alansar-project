'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

interface OrderItem {
  id: string
  productId: string
  quantity: number
  unitPrice: number
  product: {
    name: string
  }
}

interface Order {
  id: string
  finalTotal: number
  status: string
  createdAt: string
  recipient: {
    name: string
    phone: string
  }
  items: OrderItem[]
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrders()
  }, [])

  async function loadOrders() {
    try {
      const data = await api.getAllOrders()
      setOrders(data || [])
    } catch (error) {
      console.error(error)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-xl">جاري التحميل...</div>
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-primary mb-8">الطلبات</h1>
          <div className="bg-white rounded-lg shadow p-8 text-center text-xl text-gray-600">
            لا توجد طلبات حالياً
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-primary mb-8">الطلبات</h1>

        <div className="space-y-6">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold mb-2">{order.recipient?.name || order.recipients?.name}</h3>
                  <p className="text-gray-600">{order.recipient?.phone || order.recipients?.phone}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    {new Date(order.createdAt || order.created_at).toLocaleString('ar-SY')}
                  </p>
                </div>
                <div className="text-left">
                  <div className="text-3xl font-bold text-primary mb-2">
                    {(order.finalTotal || order.final_total).toLocaleString('ar-SY')} ل.س
                  </div>
                  <span className={`px-4 py-2 rounded text-white ${
                    order.status === 'delivered' ? 'bg-success' :
                    order.status === 'prepared' ? 'bg-warning' :
                    'bg-gray-400'
                  }`}>
                    {order.status === 'delivered' ? 'تم التسليم' :
                     order.status === 'prepared' ? 'جاهز' :
                     'قيد التحضير'}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-bold mb-3">المنتجات:</h4>
                <div className="space-y-2">
                  {(order.items || order.order_items || []).map((item, idx) => (
                    <div key={item.id || idx} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                      <span className="font-medium">{item.product?.name || item.products?.name || 'منتج'}</span>
                      <div className="flex gap-4 items-center">
                        <span className="text-gray-600">الكمية: {item.quantity}</span>
                        <span className="text-gray-600">
                          {(item.unitPrice || item.unit_price).toLocaleString('ar-SY')} ل.س
                        </span>
                        <span className="font-bold text-primary">
                          {(item.quantity * (item.unitPrice || item.unit_price)).toLocaleString('ar-SY')} ل.س
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
