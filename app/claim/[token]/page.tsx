'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'

interface Product {
  id: string
  name: string
  price: number
  stock: number
  imageUrl: string | null
}

export default function ClaimPage() {
  const params = useParams()
  const token = params.token as string

  const [products, setProducts] = useState<Product[]>([])
  const [localCart, setLocalCart] = useState<{[key: string]: number}>({})
  const [recipientName, setRecipientName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [orderSubmitted, setOrderSubmitted] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [existingOrder, setExistingOrder] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      
      const productsData = await api.getProducts()
      setProducts(productsData)
      
      const cartData = await api.getCart(token)
      
      if (cartData.error) {
        setError(cartData.error)
        return
      }
      
      setRecipientName(cartData.recipient.name)
      setOrderSubmitted(cartData.recipient.orderSubmitted)
      
      // إذا كان مسجل مسبقاً، جلب الطلب
      if (cartData.recipient.orderSubmitted) {
        const ordersData = await api.getAllOrders()
        console.log('Orders:', ordersData)
        console.log('Recipient ID:', cartData.recipient.id)
        const userOrder = ordersData.find((o: any) => {
          const orderId = o.recipient_id || o.recipientId
          return orderId === cartData.recipient.id
        })
        console.log('Found order:', userOrder)
        setExistingOrder(userOrder)
      }
    } catch (err) {
      setError('فشل في تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  function addToCart(productId: string) {
    setLocalCart(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1
    }))
  }

  function removeFromCart(productId: string) {
    setLocalCart(prev => {
      const newCart = {...prev}
      if (newCart[productId] > 1) {
        newCart[productId]--
      } else {
        delete newCart[productId]
      }
      return newCart
    })
  }

  async function submitOrder() {
    try {
      setError('')
      setLoading(true)
      
      for (const [productId, quantity] of Object.entries(localCart)) {
        await api.addToCart(token, productId, quantity)
      }
      
      const data = await api.submitOrder(token)
      
      if (data.error) {
        setError(data.error)
        setLoading(false)
        return
      }
      
      setOrderSubmitted(true)
      
      // جلب الطلب اللي تم إنشاؤه
      const ordersData = await api.getAllOrders()
      const cartData = await api.getCart(token)
      const userOrder = ordersData.find((o: any) => {
        const orderId = o.recipient_id || o.recipientId
        return orderId === cartData.recipient.id
      })
      setExistingOrder(userOrder)
      
      setSuccessMessage('تم تأكيد طلبك بنجاح! شكراً لك.')
    } catch (err) {
      setError('فشل في تأكيد الطلب')
    } finally {
      setLoading(false)
    }
  }

  function getCartQuantity(productId: string): number {
    return localCart[productId] || 0
  }

  const cartTotal = Object.entries(localCart).reduce((sum, [productId, quantity]) => {
    const product = products.find(p => p.id === productId)
    return sum + (product ? product.price * quantity : 0)
  }, 0)
  
  const cartItemsCount = Object.values(localCart).reduce((sum, qty) => sum + qty, 0)
  const baseLimit = 500000
  const exceptionalMargin = 10000
  const remaining = baseLimit - cartTotal
  const difference = cartTotal - baseLimit
  
  // حساب أصغر منتج
  const smallestItemPrice = Object.keys(localCart).length > 0 
    ? Math.min(...Object.keys(localCart).map(id => products.find(p => p.id === id)?.price || Infinity))
    : Infinity
  
  // التحقق من الهامش
  const isMarginAllowed = cartTotal <= baseLimit || 
    (difference <= exceptionalMargin && smallestItemPrice > difference)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-2xl text-gray-600">جاري التحميل...</div>
      </div>
    )
  }

  if (orderSubmitted) {
    if (!existingOrder) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="text-2xl text-gray-600">جاري تحميل الطلب...</div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-bold mb-2">{recipientName}</h3>
                <p className="text-gray-600">{existingOrder.recipients?.phone || existingOrder.recipient?.phone}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {new Date(existingOrder.created_at || existingOrder.createdAt).toLocaleString('ar-SY')}
                </p>
              </div>
              <div className="text-left">
                <div className="text-3xl font-bold text-primary mb-2">
                  {(existingOrder.final_total || existingOrder.finalTotal).toLocaleString('ar-SY')} ل.س
                </div>
                <span className="px-4 py-2 rounded text-white bg-gray-400">
                  قيد التحضير
                </span>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-bold mb-3">المنتجات:</h4>
              <div className="space-y-2">
                {(existingOrder.order_items || existingOrder.items || []).map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                    <span className="font-medium">{item.products?.name || item.product?.name || 'منتج'}</span>
                    <div className="flex gap-4 items-center">
                      <span className="text-gray-600">الكمية: {item.quantity}</span>
                      <span className="text-gray-600">
                        {(item.unit_price || item.unitPrice).toLocaleString('ar-SY')} ل.س
                      </span>
                      <span className="font-bold text-primary">
                        {(item.quantity * (item.unit_price || item.unitPrice)).toLocaleString('ar-SY')} ل.س
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-primary text-white py-6 px-4 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">مرحباً {recipientName}</h1>
          <p className="text-xl">اختر المواد الغذائية التي تحتاجها</p>
        </div>
      </div>

      <div className="bg-white border-b-4 border-primary-light py-6 px-4 sticky top-0 z-10 shadow">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="text-lg text-gray-600 mb-1">المجموع الحالي</div>
              <div className="text-4xl font-bold text-primary">
                {cartTotal.toLocaleString('ar-SY')} ل.س
              </div>
            </div>
            <div>
              <div className="text-lg text-gray-600 mb-1">المتبقي</div>
              <div className={`text-4xl font-bold ${remaining >= 0 ? 'text-success' : 'text-secondary'}`}>
                {remaining.toLocaleString('ar-SY')} ل.س
              </div>
            </div>
          </div>
          
          {cartTotal > baseLimit && (
            <div className="bg-secondary-light text-white p-4 rounded-lg text-lg">
              تم استخدام الهامش الاستثنائي (+{(cartTotal - baseLimit).toLocaleString('ar-SY')} ل.س)
            </div>
          )}
          
          {!isMarginAllowed && cartTotal > baseLimit && (
            <div className="bg-error text-white p-4 rounded-lg text-lg mt-2">
              تجاوز الحد المسموح! أصغر منتج ({smallestItemPrice.toLocaleString('ar-SY')}) أقل من الفارق ({(cartTotal - baseLimit).toLocaleString('ar-SY')})
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="bg-error text-white p-4 rounded-lg text-xl">
            {error}
          </div>
        </div>
      )}
      
      {successMessage && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="bg-success text-white p-4 rounded-lg text-xl">
            {successMessage}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8 pb-32">
        <div className="space-y-3">
          {products.map(product => {
            const quantity = getCartQuantity(product.id)
            return (
              <div key={product.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between gap-3">
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-1">{product.name}</h3>
                  <div className="text-2xl font-bold text-primary">
                    {product.price.toLocaleString('ar-SY')} ل.س
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => removeFromCart(product.id)}
                    disabled={quantity === 0}
                    className="bg-error text-white text-2xl font-bold w-12 h-12 rounded-lg hover:opacity-90 disabled:opacity-30"
                  >
                    -
                  </button>
                  <div className="text-2xl font-bold text-primary min-w-[50px] text-center bg-gray-100 rounded-lg px-3 py-2">
                    {quantity}
                  </div>
                  <button
                    onClick={() => addToCart(product.id)}
                    className="bg-success text-white text-2xl font-bold w-12 h-12 rounded-lg hover:opacity-90"
                  >
                    +
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {cartItemsCount > 0 && isMarginAllowed && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-primary p-4 shadow-lg">
            <div className="max-w-7xl mx-auto">
              <button
                onClick={() => setShowSummary(true)}
                className="w-full bg-success text-white text-2xl font-bold py-4 rounded-lg hover:opacity-90"
              >
                رفع الطلب ({cartItemsCount} منتج - {cartTotal.toLocaleString('ar-SY')} ل.س)
              </button>
            </div>
          </div>
        )}
        
        {cartItemsCount > 0 && !isMarginAllowed && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-error p-4 shadow-lg">
            <div className="max-w-7xl mx-auto">
              <button
                disabled
                className="w-full bg-gray-400 text-white text-2xl font-bold py-4 rounded-lg opacity-50 cursor-not-allowed"
              >
                لا يمكن رفع الطلب - تجاوز الحد المسموح
              </button>
            </div>
          </div>
        )}

        {showSummary && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <h2 className="text-3xl font-bold mb-6 text-center">ملخص الطلب</h2>
              
              <div className="space-y-3 mb-6">
                {Object.entries(localCart).map(([productId, quantity]) => {
                  const product = products.find(p => p.id === productId)
                  if (!product) return null
                  return (
                    <div key={productId} className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                      <div>
                        <div className="font-bold text-lg">{product.name}</div>
                        <div className="text-gray-600">الكمية: {quantity}</div>
                      </div>
                      <div className="text-xl font-bold text-primary">
                        {(product.price * quantity).toLocaleString('ar-SY')} ل.س
                      </div>
                    </div>
                  )
                })}
              </div>
              
              <div className="border-t-2 pt-4 mb-6">
                <div className="flex justify-between items-center text-2xl font-bold">
                  <span>المجموع الكلي:</span>
                  <span className="text-primary">{cartTotal.toLocaleString('ar-SY')} ل.س</span>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSummary(false)}
                  className="flex-1 bg-gray-400 text-white text-xl font-bold py-4 rounded-lg hover:opacity-90"
                >
                  تعديل
                </button>
                <button
                  onClick={() => {
                    setShowSummary(false)
                    submitOrder()
                  }}
                  className="flex-1 bg-success text-white text-xl font-bold py-4 rounded-lg hover:opacity-90"
                >
                  تأكيد الطلب
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
