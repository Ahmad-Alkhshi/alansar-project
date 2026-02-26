'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import * as XLSX from 'xlsx'

const API_URL = process.env.NEXT_PUBLIC_API_URL || '${API_URL}'

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
  const [importing, setImporting] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
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
      const res = await fetch(`${API_URL}/admin/products`)
      const data = await res.json()
      // تحويل is_active إلى isActive
      const products = data.map((p: any) => ({
        ...p,
        isActive: p.is_active
      }))
      setProducts(products)
    } catch (error) {
      console.error('Load error:', error)
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

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    const reader = new FileReader()
    
    reader.onload = async (event) => {
      try {
        const data = event.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]
        
        // تخطي السطر الأول (headers)
        for (let i = 1; i < rows.length; i++) {
          const [name, quantity, price] = rows[i]
          
          if (name && quantity && price) {
            await api.createProduct({
              name: `${name} - ${quantity}`,
              price: parseInt(price),
              stock: 999,
            })
          }
        }
        
        alert('تم استيراد المنتجات بنجاح!')
        loadProducts()
      } catch (error) {
        alert('فشل في استيراد المنتجات')
      } finally {
        setImporting(false)
        e.target.value = ''
      }
    }
    
    reader.readAsBinaryString(file)
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

  async function toggleProductVisibility(id: string, currentStatus: boolean) {
    try {
      await api.updateProduct(id, { isActive: !currentStatus })
      loadProducts()
    } catch (error) {
      console.error('Error:', error)
      alert('فشل في تحديث المنتج')
    }
  }

  function toggleSelect(id: string) {
    setSelectedProducts(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  function toggleSelectAll() {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(products.map(p => p.id))
    }
  }

  async function bulkHide() {
    if (selectedProducts.length === 0) return
    try {
      for (const id of selectedProducts) {
        await api.updateProduct(id, { isActive: false })
      }
      setSelectedProducts([])
      loadProducts()
    } catch (error) {
      alert('فشل في إخفاء المنتجات')
    }
  }

  async function bulkShow() {
    if (selectedProducts.length === 0) return
    try {
      for (const id of selectedProducts) {
        await api.updateProduct(id, { isActive: true })
      }
      setSelectedProducts([])
      loadProducts()
    } catch (error) {
      alert('فشل في إظهار المنتجات')
    }
  }

  async function bulkDelete() {
    if (selectedProducts.length === 0) return
    if (!confirm(`هل أنت متأكد من حذف ${selectedProducts.length} منتج؟`)) return
    try {
      for (const id of selectedProducts) {
        await api.deleteProduct(id)
      }
      setSelectedProducts([])
      loadProducts()
    } catch (error) {
      alert('فشل في حذف المنتجات')
    }
  }

  function downloadTemplate() {
    const template = [
      { 'اسم المادة': 'رز', 'الكمية': '1 كيلو', 'السعر': '45000' }
    ]
    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'نموذج')
    XLSX.writeFile(wb, 'نموذج_المنتجات.xlsx')
  }

  if (loading) {
    return <div className="p-8 text-center">جاري التحميل...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-primary">إدارة المنتجات</h1>
          <div className="flex gap-3">
            <button
              onClick={downloadTemplate}
              className="bg-warning text-white px-6 py-3 rounded-lg hover:opacity-90"
            >
              📄 تحميل نموذج Excel
            </button>
            <label className="bg-success text-white px-6 py-3 rounded-lg hover:opacity-90 cursor-pointer">
              {importing ? 'جاري الاستيراد...' : 'استيراد من Excel'}
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImport}
                disabled={importing}
                className="hidden"
              />
            </label>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark"
            >
              {showForm ? 'إلغاء' : 'إضافة منتج'}
            </button>
          </div>
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

        {selectedProducts.length > 0 && (
          <div className="bg-primary-light p-4 rounded-lg mb-4 flex items-center justify-between">
            <span className="text-lg font-bold">تم تحديد {selectedProducts.length} منتج</span>
            <div className="flex gap-3">
              <button
                onClick={bulkShow}
                className="bg-success text-white px-4 py-2 rounded-lg hover:opacity-90"
              >
                إظهار الكل
              </button>
              <button
                onClick={bulkHide}
                className="bg-warning text-white px-4 py-2 rounded-lg hover:opacity-90"
              >
                إخفاء الكل
              </button>
              <button
                onClick={bulkDelete}
                className="bg-error text-white px-4 py-2 rounded-lg hover:opacity-90"
              >
                حذف الكل
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-primary text-white">
              <tr>
                <th className="p-4 text-right">
                  <input
                    type="checkbox"
                    checked={selectedProducts.length === products.length && products.length > 0}
                    onChange={toggleSelectAll}
                    className="w-5 h-5 cursor-pointer"
                  />
                </th>
                <th className="p-4 text-right">المادة</th>
                <th className="p-4 text-right">السعر</th>
                <th className="p-4 text-right">الحالة</th>
                <th className="p-4 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => toggleSelect(product.id)}
                      className="w-5 h-5 cursor-pointer"
                    />
                  </td>
                  <td className="p-4 text-lg">{product.name}</td>
                  <td className="p-4 text-lg font-bold">{product.price.toLocaleString('ar-SY')} ل.س</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded text-white ${product.isActive ? 'bg-success' : 'bg-gray-400'}`}>
                      {product.isActive ? 'ظاهر' : 'مخفي'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleProductVisibility(product.id, product.isActive)}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 text-2xl"
                        title={product.isActive ? 'إخفاء' : 'إظهار'}
                      >
                        {product.isActive ? '👁️' : '👁️‍🗨️'}
                      </button>
                      <button
                        onClick={() => deleteProduct(product.id)}
                        className="bg-error text-white px-4 py-2 rounded hover:opacity-90"
                      >
                        حذف
                      </button>
                    </div>
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
