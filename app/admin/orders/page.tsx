"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  warehouse_status: string;
  warehouse_notes: string | null;
  products: {
    name: string;
    unit_weight?: number;
    unit?: string;
  };
}

interface Order {
  id: string;
  final_total: number;
  status: string;
  warehouse_status: string;
  warehouse_notes: string | null;
  worker_name: string | null;
  basket_number: number | null;
  created_at: string;
  recipients: {
    name: string;
    phone: string;
  };
  order_items: OrderItem[];
}

interface EditRequest {
  id: string;
  order_id: string;
  reason: string;
  status: string;
  created_at: string;
  orders: {
    id: string;
    final_total: number;
    recipients: {
      name: string;
      phone: string;
    };
  };
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [editRequests, setEditRequests] = useState<EditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"orders" | "editRequests" | "issues">(
    "orders",
  );
  const [editDeadlineDays, setEditDeadlineDays] = useState(2);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showCopyMessage, setShowCopyMessage] = useState(false);

  const warehouseUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/warehouse/warehouse-access`
    : '';

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  function copyWarehouseLink() {
    navigator.clipboard.writeText(warehouseUrl);
    setShowCopyMessage(true);
    setTimeout(() => setShowCopyMessage(false), 3000);
  }

  async function resetOrderForPreparation(orderId: string) {
    if (!confirm('هل تريد إعادة تجهيز هذا الطلب؟ سيتم مسح كل البيانات السابقة.')) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/warehouse/orders/${orderId}/reset`, {
        method: 'POST'
      });

      if (!res.ok) throw new Error('فشل في إعادة التعيين');

      alert('✓ تم إعادة تعيين الطلب بنجاح');
      loadData();
    } catch (error) {
      alert('فشل في إعادة تعيين الطلب');
    }
  }

  async function resolveIssue(orderId: string) {
    if (!confirm('هل تم حل المشكلة؟ سيتم تحويل الطلب إلى "تم التجهيز".')) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/warehouse/orders/${orderId}/resolve`, {
        method: 'POST'
      });

      if (!res.ok) throw new Error('فشل في حل المشكلة');

      alert('✓ تم حل المشكلة بنجاح');
      loadData();
    } catch (error) {
      alert('فشل في حل المشكلة');
    }
  }

  async function resetAllOrders() {
    const confirmText = prompt(
      'تحذير: هذا الإجراء سيعيد تعيين جميع الطلبات!\n\n' +
      'اكتب "تأكيد" للمتابعة:'
    );

    if (confirmText !== 'تأكيد') {
      return;
    }

    try {
      setLoading(true);
      
      // Bulk reset all orders in one API call
      const res = await fetch(`${API_URL}/warehouse/orders/reset-all`, {
        method: 'POST'
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'فشل في إعادة التعيين');
      }

      alert(`✓ تم إعادة تعيين ${data.count} طلب بنجاح`);
      loadData();
    } catch (error) {
      console.error('خطأ في إعادة تعيين الطلبات:', error);
      alert('فشل في إعادة تعيين الطلبات');
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [ordersData, requestsData] = await Promise.all([
        api.getAllOrders(),
        api.getEditRequests(),
      ]);
      setOrders(ordersData || []);
      setEditRequests(requestsData || []);

      // جلب المهلة من localStorage
      const savedDeadline = localStorage.getItem("editDeadlineDays");
      if (savedDeadline) {
        setEditDeadlineDays(Number(savedDeadline));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(requestId: string) {
    try {
      await api.approveEditRequest(requestId);
      loadData();
    } catch (error) {
      console.error(error);
    }
  }

  async function handleReject(requestId: string) {
    try {
      await api.rejectEditRequest(requestId);
      loadData();
    } catch (error) {
      console.error(error);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-xl">جاري التحميل...</div>;
  }

  const pendingRequests = editRequests.filter((r) => r.status === "pending");

  const filteredOrders = orders.filter(order => {
    if (filterStatus === "all") return true;
    if (filterStatus === "has_issues") return order.warehouse_status === "has_issues";
    if (filterStatus === "completed") return order.warehouse_status === "completed";
    if (filterStatus === "pending") return order.warehouse_status === "pending";
    if (filterStatus === "in_progress") return order.warehouse_status === "in_progress";
    return true;
  });

  const ordersWithIssues = orders.filter(o => o.warehouse_status === "has_issues");

  return (
    <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-primary">الطلبات</h1>
          <div className="flex gap-4 items-center">
            <button
              onClick={resetAllOrders}
              className="bg-error text-white px-6 py-3 rounded-lg font-bold hover:opacity-90 transition flex items-center gap-2"
            >
              <span>إعادة تجهيز كل الطلبات</span>
            </button>
            <button
              onClick={copyWarehouseLink}
              className="bg-success text-white px-6 py-3 rounded-lg font-bold hover:opacity-90 transition flex items-center gap-2"
            >
              <span>📋</span>
              <span>نسخ رابط المستودع</span>
            </button>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border-2 border-gray-300 rounded-lg px-4 py-2 text-lg"
            >
              <option value="all">كل الطلبات</option>
              <option value="pending">بانتظار التجهيز</option>
              <option value="in_progress">قيد التجهيز</option>
              <option value="completed">تم التجهيز</option>
              <option value="has_issues">فيها مشاكل</option>
            </select>
            <div className="bg-white rounded-lg shadow px-6 py-3">
              <span className="text-gray-600 ml-2">عدد المسجلين:</span>
              <span className="text-2xl font-bold text-primary">{orders.length}</span>
            </div>
          </div>
        </div>

        {/* {showCopyMessage && (
          <div className="bg-success text-white p-4 rounded-lg mb-6 text-center font-bold animate-pulse">
            ✓ تم نسخ رابط المستودع بنجاح!
          </div>
        )} */}

        {/* إعدادات مهلة التعديل */}
        {/* <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-4">
            <label className="text-lg font-bold">مهلة التعديل المسموحة:</label>
            <input
              type="number"
              min="0"
              max="30"
              value={editDeadlineDays}
              onChange={(e) => {
                const value = Number(e.target.value);
                setEditDeadlineDays(value);
                localStorage.setItem("editDeadlineDays", value.toString());
              }}
              className="border-2 border-gray-300 rounded-lg px-4 py-2 text-lg w-24"
            />
            <span className="text-lg">يوم</span>
            <span className="text-sm text-gray-500">
              (0 = منع التعديل المباشر)
            </span>
          </div>
        </div> */}

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-3 rounded-lg font-bold transition ${
              activeTab === 'orders'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            الطلبات ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('issues')}
            className={`px-6 py-3 rounded-lg font-bold transition relative ${
              activeTab === 'issues'
                ? 'bg-error text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            المشاكل ({ordersWithIssues.length})
            {ordersWithIssues.length > 0 && (
              <span className="absolute -top-2 -left-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                {ordersWithIssues.length}
              </span>
            )}
          </button>
        </div>

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-xl text-gray-600">
                لا توجد طلبات حالياً
              </div>
            ) : (
              filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-lg shadow-lg p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-bold mb-2">
                        {order.recipients?.name}
                      </h3>
                      <p className="text-gray-600">
                        {order.recipients?.phone}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        {new Date(
                          order.created_at,
                        ).toLocaleString("ar-SY")}
                      </p>
                      {order.worker_name && (
                        <p className="text-sm text-primary font-bold mt-2">
                          👷 العامل: {order.worker_name}
                        </p>
                      )}
                      {order.basket_number && (
                        <p className="text-sm text-success font-bold mt-1">
                          🧺 رقم السلة: {order.basket_number}
                        </p>
                      )}
                    </div>
                    <div className="text-left">
                      <div className="text-3xl font-bold text-primary mb-2">
                        {order.final_total.toLocaleString(
                          "ar-SY",
                        )}{" "}
                        
                      </div>
                      <div className="mb-2 text-lg text-gray-700">
                        <span className="font-bold">الوزن:</span>{" "}
                        <span className="text-primary font-bold">
                          {(order.order_items.reduce((sum, item) => 
                            sum + (item.quantity * (item.products?.unit_weight || 1000)), 0
                          ) / 1000).toFixed(2)} كغ
                        </span>
                        {(order.order_items.reduce((sum, item) => 
                          sum + (item.quantity * (item.products?.unit_weight || 1000)), 0
                        ) / 1000) > 15 && (
                          <span className="mr-2 text-warning">⚠️</span>
                        )}
                      </div>
                      <div className="flex gap-2 flex-wrap justify-end">
                        <span
                          className={`px-4 py-2 rounded text-white ${
                            order.status === "delivered"
                              ? "bg-success"
                              : order.status === "prepared"
                                ? "bg-warning"
                                : "bg-gray-400"
                          }`}
                        >
                          {order.status === "delivered"
                            ? "تم التسليم"
                            : order.status === "prepared"
                              ? "جاهز"
                              : "قيد التحضير"}
                        </span>
                        <span
                          className={`px-4 py-2 rounded text-white ${
                            order.warehouse_status === "completed"
                              ? "bg-success"
                              : order.warehouse_status === "has_issues"
                                ? "bg-error"
                                : order.warehouse_status === "in_progress"
                                  ? "bg-warning"
                                  : "bg-gray-400"
                          }`}
                        >
                          {order.warehouse_status === "completed"
                            ? "✓ تم التجهيز"
                            : order.warehouse_status === "has_issues"
                              ? "⚠️ مشاكل"
                              : order.warehouse_status === "in_progress"
                                ? "⏳ قيد التجهيز"
                                : "⏸️ بانتظار التجهيز"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {order.warehouse_notes && (
                    <div className="mb-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                      <p className="font-bold text-yellow-800 mb-1">ملاحظات المستودع:</p>
                      <p className="text-yellow-700">{order.warehouse_notes}</p>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <h4 className="font-bold mb-3">المواد:</h4>
                    <div className="space-y-2">
                      {order.order_items.map(
                        (item, idx) => (
                          <div
                            key={item.id || idx}
                            className={`flex justify-between items-center p-3 rounded ${
                              item.warehouse_status === 'issue' 
                                ? 'bg-red-50 border-2 border-red-200' 
                                : item.warehouse_status === 'checked'
                                  ? 'bg-green-50 border-2 border-green-200'
                                  : 'bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {item.warehouse_status === 'checked' && (
                                <span className="text-2xl">✓</span>
                              )}
                              {item.warehouse_status === 'issue' && (
                                <span className="text-2xl">⚠️</span>
                              )}
                              <div>
                                <span className="font-medium block">
                                  {item.products?.name || "منتج"}
                                  {item.products?.unit && ` - ${item.products.unit}`}
                                </span>
                                {item.warehouse_notes && (
                                  <span className="text-sm text-red-600 block mt-1">
                                    {item.warehouse_notes}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-4 items-center">
                              <span className="text-gray-600">
                                الكمية: {item.quantity}
                              </span>
                              <span className="text-gray-600">
                                {item.unit_price.toLocaleString("ar-SY")}{" "}
                                
                              </span>
                              <span className="font-bold text-primary">
                                {(
                                  item.quantity *
                                  item.unit_price
                                ).toLocaleString("ar-SY")}{" "}
                                
                              </span>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  {(order.warehouse_status === 'completed' || order.warehouse_status === 'has_issues') && (
                    <div className="border-t pt-4 mt-4">
                      <button
                        onClick={() => resetOrderForPreparation(order.id)}
                        className="w-full bg-warning text-white px-6 py-3 rounded-lg font-bold hover:opacity-90"
                      >
                        🔄 إعادة تجهيز السلة
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Issues Tab */}
        {activeTab === "issues" && (
          <div>
            {ordersWithIssues.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-6xl mb-4">✅</div>
                <p className="text-2xl font-bold text-success mb-2">
                   لا توجد مشاكل
                </p>
                <p className="text-gray-500">
                  جميع الطلبات تم تجهيزها بنجاح
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-error text-white">
                      <tr>
                        <th className="px-4 py-3 text-right">المستفيد</th>
                        <th className="px-4 py-3 text-right">المادة</th>
                        <th className="px-4 py-3 text-right">الكمية</th>
                        <th className="px-4 py-3 text-right">المشكلة</th>
                        <th className="px-4 py-3 text-right">ملاحظات عامة</th>
                        <th className="px-4 py-3 text-right">العامل</th>
                        <th className="px-4 py-3 text-right">التاريخ</th>
                        <th className="px-4 py-3 text-right">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordersWithIssues.map((order) =>
                        order.order_items
                          .filter((item) => item.warehouse_status === "issue")
                          .map((item, idx) => (
                            <tr
                              key={`${order.id}-${item.id || idx}`}
                              className="border-b hover:bg-red-50"
                            >
                              <td className="px-4 py-3">
                                <div className="font-bold">
                                  {order.recipients?.name}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {order.recipients?.phone}
                                </div>
                              </td>
                              <td className="px-4 py-3 font-medium">
                                {item.products?.name || "منتج"}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="bg-gray-100 px-3 py-1 rounded">
                                  {item.quantity}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="bg-red-100 border border-red-300 rounded px-3 py-2">
                                  {item.warehouse_notes || "لا توجد تفاصيل"}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {order.warehouse_notes ? (
                                  <div className="bg-yellow-100 border border-yellow-300 rounded px-3 py-2 text-sm">
                                    {order.warehouse_notes}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {order.worker_name ? (
                                  <div className="text-sm font-bold text-primary">
                                    {order.worker_name}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                                {new Date(order.created_at).toLocaleDateString("ar-SY")}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => resolveIssue(order.id)}
                                    className="bg-success text-white px-3 py-2 rounded text-sm font-bold hover:opacity-90 whitespace-nowrap"
                                    title="تم حل المشكلة"
                                  >
                                    ✓ حل
                                  </button>
                                  <button
                                    onClick={() => resetOrderForPreparation(order.id)}
                                    className="bg-warning text-white px-3 py-2 rounded text-sm font-bold hover:opacity-90 whitespace-nowrap"
                                    title="إعادة تجهيز"
                                  >
                                    🔄
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Edit Requests Tab */}
        {activeTab === "editRequests" && (
          <div className="space-y-6">
            {editRequests.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-xl text-gray-600">
                لا توجد طلبات تعديل
              </div>
            ) : (
              editRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-white rounded-lg shadow-lg p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-bold mb-2">
                        {request.orders.recipients.name}
                      </h3>
                      <p className="text-gray-600">
                        {request.orders.recipients.phone}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        {new Date(request.created_at).toLocaleString("ar-SY")}
                      </p>
                    </div>
                    <div className="text-left">
                      <div className="text-2xl font-bold text-primary mb-2">
                        {request.orders.final_total.toLocaleString("ar-SY")} 
                      </div>
                      <span
                        className={`px-4 py-2 rounded text-white ${
                          request.status === "approved"
                            ? "bg-success"
                            : request.status === "rejected"
                              ? "bg-red-500"
                              : "bg-yellow-500"
                        }`}
                      >
                        {request.status === "approved"
                          ? "تم القبول"
                          : request.status === "rejected"
                            ? "تم الرفض"
                            : "قيد المراجعة"}
                      </span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-bold mb-2">سبب طلب التعديل:</h4>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded">
                      {request.reason}
                    </p>
                  </div>

                  {request.status === "pending" && (
                    <div className="flex gap-4 mt-4">
                      <button
                        onClick={() => handleApprove(request.id)}
                        className="flex-1 bg-success text-white px-6 py-3 rounded-lg font-bold hover:bg-green-600 transition"
                      >
                        قبول الطلب
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
                        className="flex-1 bg-red-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-600 transition"
                      >
                        رفض الطلب
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

