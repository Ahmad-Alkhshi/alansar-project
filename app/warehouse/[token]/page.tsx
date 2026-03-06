"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Product {
  id: string;
  name: string;
  price: number;
  unit_weight: number; // Weight per unit in grams
  unit?: string; // Unit description
}

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  warehouse_status: string;
  warehouse_notes: string | null;
  products: Product;
}

interface Order {
  id: string;
  orderNumber: number;
  basketNumber?: number;
  basket_number?: number; // API returns this
  final_total: number;
  warehouse_status: string;
  warehouse_locked_by: string | null;
  recipients: {
    name: string;
    phone: string;
    fileNumber?: string;
  };
  order_items: OrderItem[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function WarehousePage() {
  const params = useParams();
  const token = params.token as string;

  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [generalNotes, setGeneralNotes] = useState("");
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [workerName, setWorkerName] = useState<string>("");
  const [completedBaskets, setCompletedBaskets] = useState<number>(0);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [confirmedBasketNumber, setConfirmedBasketNumber] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadWorkerInfo();
  }, [token]);

  useEffect(() => {
    if (workerId) {
      loadOrders();
      const interval = setInterval(() => {
        // Don't update if confirmation popup is showing OR if order is selected
        if (!showConfirmPopup && !selectedOrder) {
          loadOrders();
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [workerId, showConfirmPopup, selectedOrder]);

  async function loadWorkerInfo() {
    try {
      // Generate or get device ID
      let deviceId = localStorage.getItem('device_id');
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('device_id', deviceId);
      }

      const res = await fetch(`${API_URL}/workers/token/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId })
      });
      
      if (!res.ok) {
        const error = await res.json();
        
        if (error.error === 'DEVICE_MISMATCH') {
          alert('⚠️ هذا الرابط مفتوح على جهاز آخر\n\nلا يمكن فتح الرابط على أكثر من جهاز في نفس الوقت');
          setLoading(false);
          return;
        }
        
        alert(error.error || 'رابط غير صالح');
        setLoading(false);
        return;
      }

      const worker = await res.json();
      setWorkerId(worker.id);
      setWorkerName(worker.name);

      // Load worker stats
      const statsRes = await fetch(`${API_URL}/workers/${worker.id}/stats`);
      const stats = await statsRes.json();
      setCompletedBaskets(stats.completedBaskets || 0);

      setLoading(false);
    } catch (err) {
      console.error('Error loading worker info:', err);
      alert('فشل في تحميل معلومات العامل');
      setLoading(false);
    }
  }

  async function loadOrders() {
    try {
      const res = await fetch(`${API_URL}/warehouse/orders`);
      const data = await res.json();
      console.log('📦 Warehouse orders loaded:', data.length, 'pending orders');
      
      // API الآن يرجع فقط الطلبات pending لتحسين الأداء
      setOrders(data);
      
      // Check if worker has a locked order (restore state after refresh)
      // نحتاج جلب الطلب المقفول من API منفصل
      if (workerId && !selectedOrder) {
        const lockedRes = await fetch(`${API_URL}/warehouse/orders/my-locked/${workerId}`);
        if (lockedRes.ok) {
          const myLockedOrder = await lockedRes.json();
          if (myLockedOrder) {
            console.log('🔄 Restoring locked order after refresh:', myLockedOrder.id);
            setSelectedOrder({
              ...myLockedOrder,
              basketNumber: myLockedOrder.basket_number || myLockedOrder.basketNumber
            });
          }
        }
      }
      
      // Only hide loading after we've determined the state
      if (!initialLoadComplete) {
        setInitialLoadComplete(true);
        setLoading(false);
      }
    } catch (err) {
      console.error('Error loading orders:', err);
      setLoading(false);
      setInitialLoadComplete(true);
    }
  }

  async function selectOrder(order: Order) {
    // منع الضغط المتكرر
    if (processingOrderId === order.id) return;
    
    setProcessingOrderId(order.id);
    
    try {
      const res = await fetch(`${API_URL}/warehouse/orders/${order.id}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId })
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'فشل في قفل الطلب');
        // تحديث القائمة لإزالة الطلب المقفول
        await loadOrders();
        setProcessingOrderId(null);
        return;
      }

      setSelectedOrder(order);
      setProcessingOrderId(null);
    } catch (err) {
      alert('فشل في قفل الطلب');
      await loadOrders();
      setProcessingOrderId(null);
    }
  }

  async function updateItemStatus(itemId: string, status: string, notes?: string) {
    // تحديث الواجهة فقط (لا نرسل للسيرفر)
    if (selectedOrder) {
      const updatedItems = selectedOrder.order_items.map(item =>
        item.id === itemId
          ? { ...item, warehouse_status: status, warehouse_notes: notes || null }
          : item
      );
      setSelectedOrder({ ...selectedOrder, order_items: updatedItems });
    }
    
    // لا نرسل للسيرفر - سيتم الإرسال عند الضغط على "تم التجهيز"
  }

  async function completeOrder() {
    if (!selectedOrder) return;

    const allChecked = selectedOrder.order_items.every(
      item => item.warehouse_status === 'checked' || item.warehouse_status === 'issue'
    );

    if (!allChecked) {
      alert('يجب تحديد حالة جميع المواد قبل إتمام الطلب');
      return;
    }

    try {
      // أولاً: إرسال حالة كل المواد للباك إند
      const itemUpdates = selectedOrder.order_items.map(item => 
        fetch(`${API_URL}/warehouse/items/${item.id}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            status: item.warehouse_status, 
            notes: item.warehouse_notes 
          })
        })
      );
      
      await Promise.all(itemUpdates);
      console.log('✓ تم حفظ حالة جميع المواد');

      // ثانياً: حجز رقم السلة
      const res = await fetch(`${API_URL}/warehouse/orders/${selectedOrder.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: generalNotes })
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);

      // Save basket number in separate state to prevent it from disappearing
      setConfirmedBasketNumber(data.basketNumber);
      setShowConfirmPopup(true);
    } catch (error) {
      alert('فشل في حجز رقم السلة');
      console.error(error);
    }
  }

  async function confirmComplete() {
    if (!selectedOrder) return;

    setShowConfirmPopup(false);
    setConfirmedBasketNumber(null);
    
    try {
      // Confirm the basket number (finalize order)
      await fetch(`${API_URL}/warehouse/orders/${selectedOrder.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          workerId: workerId,
          workerName: workerName
        })
      });

      alert('✓ تم إتمام تجهيز الطلب بنجاح');
      setSelectedOrder(null);
      setGeneralNotes("");
      
      // Update completed baskets count
      setCompletedBaskets(prev => prev + 1);
      
      await loadOrders();
    } catch (error) {
      alert('فشل في تأكيد التجهيز');
      console.error(error);
    }
  }

  async function cancelBasket() {
    if (!selectedOrder) return;

    try {
      // Go back to editing and reset items
      const res = await fetch(`${API_URL}/warehouse/orders/${selectedOrder.id}/cancel-basket`, {
        method: 'POST'
      });

      if (!res.ok) throw new Error('Failed to cancel basket');

      setShowConfirmPopup(false);
      setConfirmedBasketNumber(null);
      
      // Reload the order to get fresh state with reset items
      await loadOrders();
    } catch (error) {
      alert('فشل في الرجوع');
      console.error(error);
    }
  }

  async function cancelOrder() {
    if (!selectedOrder) return;

    if (confirm('هل تريد إلغاء تجهيز هذا الطلب؟')) {
      try {
        await fetch(`${API_URL}/warehouse/orders/${selectedOrder.id}/unlock`, {
          method: 'POST'
        });
        setSelectedOrder(null);
        setGeneralNotes("");
        loadOrders();
      } catch (err) {
        alert('فشل في إلغاء الطلب');
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-2xl text-gray-600">جاري التحميل...</div>
      </div>
    );
  }

  if (!workerId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-error mb-2">رابط غير صالح</h2>
          <p className="text-gray-600">يرجى التواصل مع الإدارة للحصول على رابط صحيح</p>
        </div>
      </div>
    );
  }

  if (selectedOrder) {
    const allChecked = selectedOrder.order_items?.every(
      item => item.warehouse_status === 'checked' || item.warehouse_status === 'issue'
    ) ?? false;
    const fileNumber = selectedOrder.recipients?.fileNumber || selectedOrder.recipients?.phone || 'غير معروف';

    return (
      <div className="min-h-screen bg-gray-50 pb-32" dir="rtl">
        <div className="bg-primary text-white py-4 px-4 shadow-lg sticky top-0 z-10">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="text-lg">ملف رقم: {fileNumber}</p>
              </div>
              <div className="text-center">
                <div className="text-sm mb-1">إنجازي</div>
                <div className="text-3xl font-bold">{completedBaskets} سلة</div>
              </div>
            </div>
            
            {/* ملخص المواد المختارة - ثابت في الأعلى */}
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-xs mb-1">عدد المواد المختارة</div>
                  <div className="text-2xl font-bold">
                    {selectedOrder.order_items
                      .reduce((sum, item) => {
                        // إذا checked، نجمع الكمية كاملة
                        if (item.warehouse_status === 'checked') {
                          return sum + item.quantity;
                        }
                        // إذا في نقص مع رقم، نطرح النقص من الكمية
                        if (item.warehouse_status === 'issue' && item.warehouse_notes) {
                          const shortage = parseInt(item.warehouse_notes) || 0;
                          return sum + (item.quantity - shortage);
                        }
                        // إذا issue بدون رقم، ما نحسبه
                        return sum;
                      }, 0)}
                    <span className="text-sm"> من أصل {selectedOrder.order_items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs mb-1">وزن المواد المختارة</div>
                  <div className="text-2xl font-bold text-yellow-300">
                    {(selectedOrder.order_items
                      .reduce((sum, item) => {
                        // إذا checked، نحسب الوزن كامل
                        if (item.warehouse_status === 'checked') {
                          return sum + (item.quantity * (item.products.unit_weight || 1000));
                        }
                        // إذا في نقص مع رقم، نطرح وزن النقص
                        if (item.warehouse_status === 'issue' && item.warehouse_notes) {
                          const shortage = parseInt(item.warehouse_notes) || 0;
                          const actualQuantity = item.quantity - shortage;
                          return sum + (actualQuantity * (item.products.unit_weight || 1000));
                        }
                        // إذا issue بدون رقم، ما نحسبه
                        return sum;
                      }, 0) / 1000).toFixed(2)} كغ
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">

            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">المواد المطلوبة:</h2>
              <div className="text-right">
                <div className="text-sm text-gray-600">وزن السلة</div>
                <div className="text-2xl font-bold text-primary">
                  {(selectedOrder.order_items.reduce((sum, item) => 
                    sum + (item.quantity * (item.products.unit_weight || 1000)), 0
                  ) / 1000).toFixed(2)} كغ
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {selectedOrder.order_items.map((item) => (
                <div key={item.id} className="flex gap-2 items-stretch">
                  {/* زر المادة الكبير */}
                  <button
                    onClick={() => {
                      // Toggle: إذا checked يرجع pending، إذا pending أو issue يصير checked
                      if (item.warehouse_status === 'checked') {
                        updateItemStatus(item.id, 'pending');
                      } else {
                        updateItemStatus(item.id, 'checked');
                      }
                    }}
                    className={`flex-1 py-1 px-4 rounded-lg font-bold text-xl ${
                      item.warehouse_status === 'checked'
                        ? 'bg-success text-white'
                        : 'bg-gray-200 text-gray-800 border-2 border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-2xl">
                        {item.warehouse_status === 'checked' ? '✓' : ''}
                      </span>
                      <div className="text-right flex-1">
                        <div className="text-xl font-bold mb-2">
                          {item.products.name}
                          {item.products.unit && ` - ${item.products.unit}`}
                        </div>
                        <div className={`text-xl font-bold ${
                          item.warehouse_status === 'checked' ? 'text-white' : 'text-primary'
                        }`}>
                          الكمية: {item.quantity}
                        </div>
                        {item.warehouse_status === 'issue' && item.warehouse_notes && (
                          <div className="text-lg mt-2 text-error font-bold">
                            نقص: {item.warehouse_notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* زر المشكلة الصغير */}
                  <button
                    onClick={() => {
                      if (item.quantity === 1) {
                        updateItemStatus(item.id, 'issue', '1');
                      } else {
                        const shortage = prompt(`كم النقص؟ (الكمية المطلوبة: ${item.quantity})`);
                        if (shortage && !isNaN(Number(shortage))) {
                          updateItemStatus(item.id, 'issue', shortage);
                        }
                      }
                    }}
                    className={`w-16 rounded-lg font-bold text-2xl ${
                      item.warehouse_status === 'issue'
                        ? 'bg-error text-white'
                        : 'bg-red-100 text-error border-2 border-error'
                    }`}
                  >
                    {item.warehouse_status === 'issue' && item.warehouse_notes 
                      ? item.warehouse_notes 
                      : '✗'}
                  </button>
                </div>
              ))}
            </div>

            {/* تنبيه الوزن الزائد - بناءً على المواد المختارة فقط مع طرح النقص */}
            {(selectedOrder.order_items
              .reduce((sum, item) => {
                // إذا checked، نحسب الوزن كامل
                if (item.warehouse_status === 'checked') {
                  return sum + (item.quantity * (item.products.unit_weight || 1000));
                }
                // إذا في نقص مع رقم، نطرح وزن النقص
                if (item.warehouse_status === 'issue' && item.warehouse_notes) {
                  const shortage = parseInt(item.warehouse_notes) || 0;
                  const actualQuantity = item.quantity - shortage;
                  return sum + (actualQuantity * (item.products.unit_weight || 1000));
                }
                // إذا issue بدون رقم، ما نحسبه
                return sum;
              }, 0) / 1000) > 15 && (
              <div className="mt-6 bg-warning text-white p-6 rounded-lg border-4 border-yellow-600">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">⚠️</span>
                  <div>
                    <p className="text-xl font-bold">تنبيه: وزن المواد المختارة أكثر من 15 كغ</p>
                    <p className="text-lg mt-1">أضف كيس آخر إلى السلة</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <label className="block text-lg font-bold mb-3">
              ملاحظات عامة (اختياري):
            </label>
            <textarea
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              className="w-full border-2 rounded-lg p-4 text-lg"
              rows={3}
              placeholder="أي ملاحظات إضافية..."
            />
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-primary p-4 shadow-lg">
          <div className="max-w-4xl mx-auto space-y-3">
            <button
              onClick={completeOrder}
              disabled={!allChecked}
              className={`w-full py-5 rounded-lg font-bold text-xl ${
                allChecked
                  ? 'bg-success text-white hover:opacity-90'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              ✓ تم التجهيز
            </button>
            <button
              onClick={cancelOrder}
              className="w-full bg-gray-400 text-white py-4 rounded-lg hover:opacity-90 font-bold text-lg"
            >
              إلغاء
            </button>
          </div>
        </div>

        {/* Confirmation Popup */}
        {showConfirmPopup && confirmedBasketNumber && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-8 max-w-md w-full">
              <div className="text-center mb-6">
                <div className="text-sm text-gray-600 mb-2">رقم السلة</div>
                <div className="text-9xl font-bold text-primary mb-4">
                  {confirmedBasketNumber}
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-3">
                  يرجى ترقيم السلة
                </h2>
                <p className="text-xl text-error font-bold mb-4">
                  هل كتبت رقم السلة على الكيس؟
                </p>
                
                {/* تذكير الكيس الإضافي - يظهر فقط إذا الوزن ≥ 15 كغ */}
                {(selectedOrder.order_items
                  .reduce((sum, item) => {
                    if (item.warehouse_status === 'checked') {
                      return sum + (item.quantity * (item.products.unit_weight || 1000));
                    }
                    if (item.warehouse_status === 'issue' && item.warehouse_notes) {
                      const shortage = parseInt(item.warehouse_notes) || 0;
                      const actualQuantity = item.quantity - shortage;
                      return sum + (actualQuantity * (item.products.unit_weight || 1000));
                    }
                    return sum;
                  }, 0) / 1000) >= 15 && (
                  <div className="bg-warning bg-opacity-20 border-2 border-warning rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 justify-center">
                      <span className="text-3xl">⚠️</span>
                      <p className="text-lg font-bold text-warning">
                        هل وضعت كيس إضافي في السلة؟
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <button
                  onClick={confirmComplete}
                  className="w-full bg-success text-white py-4 rounded-lg hover:opacity-90 font-bold text-xl"
                >
                  نعم، تم الكتابة والتجهيز
                </button>
                <button
                  onClick={cancelBasket}
                  className="w-full bg-warning text-white py-4 rounded-lg hover:opacity-90 font-bold text-lg"
                >
                  رجوع للتعديل
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // فلترة وترتيب الطلبات - تحسين الأداء
  // API يرجع pending + in_progress لتطابق صفحة الأدمن
  const totalRemainingOrders = orders.length; // العدد الكلي (pending + in_progress)
  
  const availableOrders = orders
    .filter(o => {
      // فلتر الحالة أولاً: فقط pending (المتاحة للتجهيز)
      if (o.warehouse_status !== 'pending') return false;
      
      // فلتر البحث فقط إذا كان موجود
      if (searchQuery) {
        const fileNumber = o.recipients.fileNumber || o.recipients.phone || '';
        return fileNumber.toLowerCase().includes(searchQuery.toLowerCase());
      }
      
      return true;
    })
    .sort((a, b) => {
      // ترتيب حسب الوزن من الأقل إلى الأكثر
      const weightA = a.order_items.reduce((sum, item) => 
        sum + (item.quantity * (item.products.unit_weight || 1000)), 0
      );
      const weightB = b.order_items.reduce((sum, item) => 
        sum + (item.quantity * (item.products.unit_weight || 1000)), 0
      );
      return weightA - weightB; // الأقل وزناً أولاً
    });

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-primary text-white py-6 px-4 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold mb-2">{workerName}</h1>
              <p className="text-lg">اختر طلب لتجهيزه</p>
            </div>
            <div className="text-center">
              <div className="bg-white bg-opacity-20 rounded-lg px-6 py-3">
                <div className="text-sm mb-1">إنجازي</div>
                <div className="text-4xl font-bold">{completedBaskets}</div>
                <div className="text-sm">سلة</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* صندوق البحث */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <label className="block text-lg font-bold mb-2">🔍 البحث عن رقم الملف:</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="اكتب رقم الملف أو رقم الهاتف..."
            className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-2 text-error font-bold"
            >
              ✕ مسح البحث
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold">الطلبات المتبقية</span>
            <span className="text-3xl font-bold text-primary">{totalRemainingOrders}</span>
          </div>
        </div>
        {availableOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-6xl mb-4">{searchQuery ? '🔍' : '✅'}</div>
            <p className="text-2xl font-bold text-success mb-2">
              {searchQuery ? 'لا توجد نتائج' : 'رائع! لا توجد طلبات جديدة'}
            </p>
            <p className="text-gray-500 mt-4">
              {searchQuery 
                ? 'لم يتم العثور على طلبات تطابق البحث'
                : 'جميع الطلبات تم تجهيزها أو قيد التجهيز من قبل عمال آخرين'
              }
            </p>
            <p className="text-sm text-gray-400 mt-6">
              الصفحة تتحدث تلقائياً كل ثانيتين
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {availableOrders.map((order) => {
              const isProcessing = processingOrderId === order.id;
              const fileNumber = order.recipients.fileNumber || order.recipients.phone;
              const totalWeight = (order.order_items.reduce((sum, item) => 
                sum + (item.quantity * (item.products.unit_weight || 1000)), 0
              ) / 1000).toFixed(2);
              
              return (
                <div
                  key={order.id}
                  className="bg-white rounded-lg shadow-lg p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold mb-1">
                        رقم الملف: {fileNumber}
                      </h3>
                      <p className="text-gray-600">
                        عدد المواد: {order.order_items.length}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">وزن السلة</div>
                      <div className="text-2xl font-bold text-primary">
                        {totalWeight} كغ
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => selectOrder(order)}
                    disabled={isProcessing || processingOrderId !== null}
                    className={`w-full py-4 rounded-lg font-bold text-xl transition ${
                      isProcessing
                        ? 'bg-gray-400 text-white cursor-wait'
                        : processingOrderId !== null
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-primary text-white hover:opacity-90'
                    }`}
                  >
                    {isProcessing ? 'جاري القفل...' : 'ابدأ التجهيز'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
