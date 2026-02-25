'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

interface Product {
  id: string
  name: string
  price: number
  stock: number
  imageUrl: string | null
  isActive: boolean
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    price: '',
  })

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    try {
      const data = await api.getProducts()
      setProducts(data)
    } catch (error) {
      alert('فشل في تحميل المنتجات')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api.createProduct({
        name: `${formData.name} - ${formData.quantity}`,
        price: parseInt(formData.price),
        stock: 999,
      })
      setFormData({ name: '', quantity: '', price: '' })
      setShowForm(false)
      loadProducts()
    } catch (error) {
      alert('فشل في إضافة المنتج')
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return
    
    try {
      await api.deleteProduct(id)
      loadProducts()
    } catch (error) {
      alert('فشل في حذف المنتج')
    }
  }

  if (loading) {
    return <div className="p-8 text-center">جاري التحميل...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-primary">إدارة المنتجات</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark"
          >
            {showForm ? 'إلغاء' : 'إضافة منتج'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-lg mb-8">
            <div className="grid grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="اسم المادة (مثال: رز)"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
                className="border p-3 rounded text-lg"
              />
              <input
                type="text"
                placeholder="الكمية (مثال: 1 كيلو)"
                value={formData.quantity}
                onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                required
                className="border p-3 rounded text-lg"
              />
              <input
                type="number"
                placeholder="السعر"
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
                required
                className="border p-3 rounded text-lg"
              />
            </div>
            <button
              type="submit"
              className="mt-4 bg-success text-white px-6 py-3 rounded-lg hover:opacity-90 text-lg"
            >
              حفظ
            </button>
          </form>
        )}

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-primary text-white">
              <tr>
                <th className="p-4 text-right">المادة</th>
                <th className="p-4 text-right">السعر</th>
                <th className="p-4 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 text-lg">{product.name}</td>
                  <td className="p-4 text-lg font-bold">{product.price.toLocaleString('ar-SY')} ل.س</td>
                  <td className="p-4">
                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="bg-error text-white px-4 py-2 rounded hover:opacity-90"
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
