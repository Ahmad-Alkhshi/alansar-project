"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  products: {
    name: string;
  };
}

interface Order {
  id: string;
  final_total: number;
  status: string;
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
  const [activeTab, setActiveTab] = useState<"orders" | "editRequests">(
    "orders",
  );
  const [editDeadlineDays, setEditDeadlineDays] = useState(2);

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

  return (
    <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-primary">الطلبات</h1>
          <div className="bg-white rounded-lg shadow px-6 py-3">
            <span className="text-gray-600 ml-2">عدد المسجلين:</span>
            <span className="text-2xl font-bold text-primary">{orders.length}</span>
          </div>
        </div>

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
        {/* <div className="flex gap-4 mb-6">
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
            onClick={() => setActiveTab('editRequests')}
            className={`px-6 py-3 rounded-lg font-bold transition relative ${
              activeTab === 'editRequests'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            طلبات التعديل ({editRequests.length})
            {pendingRequests.length > 0 && (
              <span className="absolute -top-2 -left-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div> */}

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            {orders.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-xl text-gray-600">
                لا توجد طلبات حالياً
              </div>
            ) : (
              orders.map((order) => (
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
                    </div>
                    <div className="text-left">
                      <div className="text-3xl font-bold text-primary mb-2">
                        {order.final_total.toLocaleString(
                          "ar-SY",
                        )}{" "}
                        
                      </div>
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
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-bold mb-3">المواد:</h4>
                    <div className="space-y-2">
                      {order.order_items.map(
                        (item, idx) => (
                          <div
                            key={item.id || idx}
                            className="flex justify-between items-center bg-gray-50 p-3 rounded"
                          >
                            <span className="font-medium">
                              {item.products?.name || "منتج"}
                            </span>
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
                </div>
              ))
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

