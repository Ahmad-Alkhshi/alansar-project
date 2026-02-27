'use client'

import { API_URL } from '@/lib/config'

import { useEffect, useState } from 'react'

interface Product {
  id: string
  name: string
  price: number
}

interface BasketItem {
  product_id: string
  quantity: number
  products: Product
}

interface DefaultBasket {
  id: string
  basket_value: number
  items: BasketItem[]
}

export default function DefaultBasketsPage() {
  const [baskets, setBaskets] = useState<DefaultBasket[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [editingBasket, setEditingBasket] = useState<string | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<{[key: string]: number}>({})

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [basketsRes, productsRes] = await Promise.all([
        fetch(`${API_URL}/default-baskets`),
        fetch(`${API_URL}/products`)
      ])
      const basketsData = await basketsRes.json()
      const productsData = await productsRes.json()
      setBaskets(basketsData)
      setProducts(productsData)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  async function createBasket(value: number) {
    try {
      await fetch(`${API_URL}/default-baskets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ basket_value: value })
      })
      loadData()
    } catch (error) {
      alert('فشل في إنشاء السلة')
    }
  }

  async function saveBasketItems(basketId: string) {
    try {
      await fetch(`${API_URL}/default-baskets/${basketId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: selectedProducts })
      })
      setEditingBasket(null)
      setSelectedProducts({})
      loadData()
    } catch (error) {
      alert('فشل في حفظ المواد')
    }
  }

  function startEdit(basket: DefaultBasket) {
    setEditingBasket(basket.id)
    const items: {[key: string]: number} = {}
    basket.items?.forEach(item => {
      items[item.product_id] = item.quantity
    })
    setSelectedProducts(items)
  }

  const calculateTotal = () => {
    return Object.entries(selectedProducts).reduce((sum, [productId, quantity]) => {
      const product = products.find(p => p.id === productId)
      return sum + (product ? product.price * quantity : 0)
    }, 0)
  }

  if (loading) {
    return <div className="p-8 text-center">جاري التحميل...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-primary mb-8">السلال الافتراضية</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-xl font-bold mb-4">إنشاء سلة افتراضية جديدة</h3>
          <div className="flex gap-4">
            <input
              type="number"
              placeholder="قيمة السلة ()"
              id="basketValue"
              className="border-2 border-gray-300 rounded-lg px-4 py-2 flex-1"
            />
            <button
              onClick={() => {
                const input = document.getElementById('basketValue') as HTMLInputElement
                if (input.value) {
                  createBasket(Number(input.value))
                  input.value = ''
                }
              }}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:opacity-90"
            >
              إنشاء
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {baskets.map(basket => (
            <div key={basket.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-primary">
                  {basket.basket_value.toLocaleString('ar-SY')} 
                </h3>
                <button
                  onClick={() => startEdit(basket)}
                  className="bg-warning text-white px-4 py-2 rounded-lg hover:opacity-90"
                >
                  تعديل المواد
                </button>
              </div>

              {editingBasket === basket.id ? (
                <div>
                  <div className="space-y-3 mb-4">
                    {products.map(product => (
                      <div key={product.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                        <span className="font-medium">{product.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-600">{product.price.toLocaleString('ar-SY')} </span>
                          <input
                            type="number"
                            min="0"
                            value={selectedProducts[product.id] || 0}
                            onChange={(e) => setSelectedProducts({
                              ...selectedProducts,
                              [product.id]: Number(e.target.value)
                            })}
                            className="border-2 border-gray-300 rounded px-2 py-1 w-20 text-center"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-4 mb-4">
                    <div className="text-xl font-bold text-primary">
                      المجموع: {calculateTotal().toLocaleString('ar-SY')} 
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setEditingBasket(null)
                        setSelectedProducts({})
                      }}
                      className="flex-1 bg-gray-400 text-white py-2 rounded-lg hover:opacity-90"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={() => saveBasketItems(basket.id)}
                      className="flex-1 bg-success text-white py-2 rounded-lg hover:opacity-90"
                    >
                      حفظ
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {basket.items && basket.items.length > 0 ? (
                    <div className="space-y-2">
                      {basket.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between bg-gray-50 p-3 rounded">
                          <span className="font-medium">{item.products.name}</span>
                          <span className="text-gray-600">الكمية: {item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center">لم يتم تحديد منتجات بعد</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


