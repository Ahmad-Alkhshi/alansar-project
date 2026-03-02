'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import * as XLSX from 'xlsx'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface Product {
  id: string
  name: string
  price: number
  stock: number
  imageUrl: string | null
  isActive: boolean
  display_order?: number
  maxQuantity?: number
  unit?: string
  unit_weight?: number
}

function SortableProduct({ product, toggleSelect, isSelected, toggleProductVisibility, deleteProduct, updateMaxQuantity, handleEdit }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: product.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <tr ref={setNodeRef} style={style} className="border-b hover:bg-gray-50">
      <td className="p-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleSelect(product.id)}
          className="w-5 h-5 cursor-pointer"
        />
      </td>
      <td className="p-4 cursor-move" {...attributes} {...listeners}>
        <span className="text-2xl">☰</span>
      </td>
      <td className="p-4 text-lg">{product.name}</td>
      <td className="p-4 text-lg">{product.unit || '1 كيلو'}</td>
      <td className="p-4 text-lg">{product.unit_weight || 1000} غ</td>
      <td className="p-4 text-lg font-bold">{product.price.toLocaleString('ar-SY')} </td>
      <td className="p-4">
        <input
          type="number"
          min="1"
          max="99"
          defaultValue={product.maxQuantity || 10}
          onBlur={(e) => {
            const newValue = Number(e.target.value);
            if (newValue !== (product.maxQuantity || 10)) {
              updateMaxQuantity(product.id, newValue);
            }
          }}
          className="border-2 border-gray-300 rounded px-2 py-1 w-16 text-center"
        />
      </td>
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
            {product.isActive ? '👁️' : '👁️🗨️'}
          </button>
          <button
            onClick={() => handleEdit(product)}
            className="bg-warning text-white px-4 py-2 rounded hover:opacity-90"
          >
            تعديل
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
  )
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [importing, setImporting] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [orderType, setOrderType] = useState<'display' | 'recipient'>('display') // Filter for order type
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    price: '',
    maxQuantity: '10',
    unit: '1 كيلو',
    unitWeight: '1000'
  })
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' })
  const [showProgress, setShowProgress] = useState(false)

  useEffect(() => {
    loadProducts()
    const interval = setInterval(() => {
      loadProducts()
    }, 30000)
    return () => clearInterval(interval)
  }, [orderType]) // Reload when order type changes

  async function loadProducts() {
    try {
      const res = await fetch(`${API_URL}/admin/products?orderType=${orderType}`)
      const data = await res.json()
      const products = data.map((p: any) => ({
        ...p,
        isActive: p.is_active,
        display_order: p.display_order || 0,
        maxQuantity: p.max_quantity || 10
      }))
      setProducts(products)
    } catch (error) {
      console.error('Load error:', error)
      alert('فشل في تحميل المواد')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, {
          name: formData.name,
          price: parseInt(formData.price),
          max_quantity: parseInt(formData.maxQuantity),
          unit: formData.unit,
          unit_weight: parseInt(formData.unitWeight)
        })
      } else {
        await api.createProduct({
          name: formData.name,
          price: parseInt(formData.price),
          stock: 999,
          max_quantity: parseInt(formData.maxQuantity),
          unit: formData.unit,
          unit_weight: parseInt(formData.unitWeight)
        })
      }
      setFormData({ name: '', quantity: '', price: '', maxQuantity: '10', unit: '1 كيلو', unitWeight: '1000' })
      setEditingProduct(null)
      setShowForm(false)
      loadProducts()
    } catch (error) {
      alert('فشل في حفظ المنتج')
    }
  }

  function handleEdit(product: Product) {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      quantity: '',
      price: product.price.toString(),
      maxQuantity: (product.maxQuantity || 10).toString(),
      unit: product.unit || '1 كيلو',
      unitWeight: (product.unit_weight || 1000).toString()
    })
    setShowForm(true)
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
        
        const products = []
        for (let i = 1; i < rows.length; i++) {
          const [name, quantity, price, maxQuantity] = rows[i]
          if (name && quantity && price) {
            products.push({
              name: `${name} - ${quantity}`,
              price: parseInt(price),
              stock: 999,
              is_active: true,
              max_quantity: maxQuantity ? parseInt(maxQuantity) : 10
            })
          }
        }
        
        setShowProgress(true)
        setProgress({ current: 0, total: products.length, message: 'جاري الاستيراد...' })
        
        await fetch(`${API_URL}/products/bulk-create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ products })
        })
        
        setProgress({ current: products.length, total: products.length, message: `تم إضافة ${products.length} منتج` })
        
        alert('تم استيراد المواد بنجاح!')
        loadProducts()
      } catch (error) {
        alert('فشل في استيراد المواد')
      } finally {
        setImporting(false)
        setShowProgress(false)
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

  async function updateMaxQuantity(id: string, maxQuantity: number) {
    try {
      console.log('Updating maxQuantity:', { id, maxQuantity })
      const res = await fetch(`${API_URL}/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_quantity: maxQuantity })
      })
      const data = await res.json()
      console.log('Response:', data)
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update')
      }
      loadProducts()
    } catch (error) {
      console.error('Update error:', error)
      alert('فشل في تحديث الحد الأقصى: ' + error)
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
      alert('فشل في إخفاء المواد')
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
      alert('فشل في إظهار المواد')
    }
  }

  async function bulkDelete() {
    if (selectedProducts.length === 0) return
    if (!confirm(`هل أنت متأكد من حذف ${selectedProducts.length} منتج؟`)) return
    
    setShowProgress(true)
    setProgress({ current: 0, total: selectedProducts.length, message: 'جاري الحذف...' })
    
    try {
      const res = await fetch(`${API_URL}/products/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedProducts })
      })
      
      const data = await res.json()
      console.log('Bulk delete response:', data)
      
      if (!res.ok) {
        throw new Error(data.error || 'فشل في الحذف')
      }
      
      setProgress({ current: selectedProducts.length, total: selectedProducts.length, message: `تم حذف ${selectedProducts.length} منتج` })
      setSelectedProducts([])
      await loadProducts()
      alert('تم الحذف بنجاح!')
    } catch (error) {
      console.error('Bulk delete error:', error)
      alert('فشل في حذف المواد: ' + error)
    } finally {
      setShowProgress(false)
    }
  }

  function downloadTemplate() {
    const template = [
      { 'اسم المادة': 'رز', 'الكمية': '1 كيلو', 'السعر': '45000', 'الحد الأقصى': '10' }
    ]
    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'نموذج')
    XLSX.writeFile(wb, 'نموذج_المواد.xlsx')
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = products.findIndex((p) => p.id === active.id)
      const newIndex = products.findIndex((p) => p.id === over.id)

      const newProducts = arrayMove(products, oldIndex, newIndex)
      setProducts(newProducts)

      const orderedProducts = newProducts.map((p, index) => ({
        id: p.id,
        order: index
      }))

      try {
        await api.updateProductsOrder(orderedProducts, orderType)
      } catch (error) {
        alert('فشل في حفظ الترتيب')
        loadProducts()
      }
    }
  }

  if (loading) {
    return <div className="p-8 text-center">جاري التحميل...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
      {showProgress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 text-center">{progress.message}</h3>
            <div className="w-full bg-gray-200 rounded-full h-6 mb-4">
              <div 
                className="bg-primary h-6 rounded-full transition-all duration-300 flex items-center justify-center text-white font-bold"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              >
                {Math.round((progress.current / progress.total) * 100)}%
              </div>
            </div>
            <p className="text-center text-lg font-bold">
              {progress.current} / {progress.total}
            </p>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-primary">إدارة المواد</h1>
          <div className="flex gap-3">
            {/* Order Type Filter */}
            <div className="flex gap-2 bg-white rounded-lg p-1 shadow">
              <button
                onClick={() => setOrderType('display')}
                className={`px-4 py-2 rounded-lg font-bold transition ${
                  orderType === 'display'
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                👷 ترتيب العمال
              </button>
              <button
                onClick={() => setOrderType('recipient')}
                className={`px-4 py-2 rounded-lg font-bold transition ${
                  orderType === 'recipient'
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                👥 ترتيب المستفيدين
              </button>
            </div>
            
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
              onClick={() => {
                setShowForm(!showForm)
                if (showForm) {
                  setEditingProduct(null)
                  setFormData({ name: '', quantity: '', price: '', maxQuantity: '10', unit: '1 كيلو', unitWeight: '1000' })
                }
              }}
              className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark"
            >
              {showForm ? 'إلغاء' : 'إضافة منتج'}
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-lg mb-8">
            <h3 className="text-xl font-bold mb-4">{editingProduct ? 'تعديل منتج' : 'إضافة منتج'}</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                placeholder="اسم المادة (مثال: رز، شاي، زيت)"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
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
            <div className="grid grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="الوحدة (مثال: 1 كيلو، 25 ظرف، 1 لتر)"
                value={formData.unit}
                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                required
                className="border p-3 rounded text-lg"
              />
              <input
                type="number"
                placeholder="وزن الوحدة بالغرام (مثال: 1000، 100، 800)"
                value={formData.unitWeight}
                onChange={e => setFormData({ ...formData, unitWeight: e.target.value })}
                required
                min="1"
                className="border p-3 rounded text-lg"
              />
              <input
                type="number"
                placeholder="الحد الأقصى للكمية"
                value={formData.maxQuantity}
                onChange={e => setFormData({ ...formData, maxQuantity: e.target.value })}
                required
                min="1"
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
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
                  <th className="p-4 text-right">ترتيب</th>
                  <th className="p-4 text-right">المادة</th>
                  <th className="p-4 text-right">الوحدة</th>
                  <th className="p-4 text-right">وزن الوحدة</th>
                  <th className="p-4 text-right">السعر</th>
                  <th className="p-4 text-right">الحد الأقصى</th>
                  <th className="p-4 text-right">الحالة</th>
                  <th className="p-4 text-right">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                <SortableContext
                  items={products.map(p => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {products.map(product => (
                    <SortableProduct
                      key={product.id}
                      product={product}
                      toggleSelect={toggleSelect}
                      isSelected={selectedProducts.includes(product.id)}
                      toggleProductVisibility={toggleProductVisibility}
                      deleteProduct={deleteProduct}
                      updateMaxQuantity={updateMaxQuantity}
                      handleEdit={handleEdit}
                    />
                  ))}
                </SortableContext>
              </tbody>
            </table>
          </DndContext>
        </div>
      </div>
    </div>
  )
}
