"use client";

import { useEffect, useState } from "react";

interface Worker {
  id: string;
  name: string;
  phone: string;
  token: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

interface WorkerStats {
  completedBaskets: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [stats, setStats] = useState<Record<string, WorkerStats>>({});
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    notes: ""
  });

  useEffect(() => {
    loadWorkers();
  }, []);

  async function loadWorkers() {
    try {
      const res = await fetch(`${API_URL}/workers`);
      
      if (!res.ok) {
        console.error('Failed to load workers:', res.status);
        setLoading(false);
        return;
      }
      
      const data = await res.json();
      
      if (!Array.isArray(data)) {
        console.error('Invalid data format:', data);
        setWorkers([]);
        setLoading(false);
        return;
      }
      
      setWorkers(data);

      // Load stats for each worker
      const statsPromises = data.map(async (worker: Worker) => {
        try {
          const statsRes = await fetch(`${API_URL}/workers/${worker.id}/stats`);
          const statsData = await statsRes.json();
          return { id: worker.id, stats: statsData };
        } catch (err) {
          return { id: worker.id, stats: { completedBaskets: 0 } };
        }
      });

      const statsResults = await Promise.all(statsPromises);
      const statsMap: Record<string, WorkerStats> = {};
      statsResults.forEach(({ id, stats }) => {
        statsMap[id] = stats;
      });
      setStats(statsMap);

      setLoading(false);
    } catch (error) {
      console.error('Error loading workers:', error);
      setWorkers([]);
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name || !formData.phone) {
      alert('الاسم ورقم الهاتف مطلوبان');
      return;
    }

    try {
      if (editingWorker) {
        // Update existing worker
        const res = await fetch(`${API_URL}/workers/${editingWorker.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error);
        }

        alert('✓ تم تحديث العامل بنجاح');
      } else {
        // Create new worker
        const res = await fetch(`${API_URL}/workers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error);
        }

        alert('✓ تم إضافة العامل بنجاح');
      }

      setFormData({ name: "", phone: "", notes: "" });
      setShowAddForm(false);
      setEditingWorker(null);
      loadWorkers();
    } catch (error: any) {
      alert(error.message || 'فشل في حفظ البيانات');
    }
  }

  async function toggleWorkerStatus(worker: Worker) {
    if (!confirm(`هل تريد ${worker.is_active ? 'تعطيل' : 'تفعيل'} حساب ${worker.name}؟`)) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/workers/${worker.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !worker.is_active })
      });

      if (!res.ok) throw new Error('فشل في تحديث الحالة');

      loadWorkers();
    } catch (error) {
      alert('فشل في تحديث الحالة');
    }
  }

  async function resetDevice(worker: Worker) {
    if (!confirm(`هل تريد إعادة تعيين الجهاز لـ ${worker.name}؟\n\nسيتمكن من فتح الرابط على جهاز جديد`)) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/workers/${worker.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: null })
      });

      if (!res.ok) throw new Error('فشل في إعادة التعيين');

      alert('✓ تم إعادة تعيين الجهاز بنجاح');
      loadWorkers();
    } catch (error) {
      alert('فشل في إعادة تعيين الجهاز');
    }
  }

  async function deleteWorker(worker: Worker) {
    if (!confirm(`هل تريد حذف العامل ${worker.name}؟\n\nتحذير: لن يتم حذف السلات التي جهزها.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/workers/${worker.id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('فشل في الحذف');

      alert('✓ تم حذف العامل بنجاح');
      loadWorkers();
    } catch (error) {
      alert('فشل في حذف العامل');
    }
  }

  function openWhatsApp(worker: Worker) {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const workerLink = `${baseUrl}/warehouse/${worker.token}`;
    const message = `السلام عليكم ورحمة الله وبركاته \n\n بارك الله بك ${worker.name}،\n\nهذا هو رابط المستودع الخاص بك:\n${workerLink}\n\nيرجى حفظ هذا الرابط واستخدامه للدخول إلى نظام تجهيز السلات.`;
    
    // تنظيف رقم الهاتف وإضافة كود سوريا إذا لم يكن موجود
    let phoneNumber = worker.phone.replace(/\D/g, ''); // إزالة كل شي غير أرقام
    
    // إذا الرقم يبدأ بـ 0، استبدله بـ 963 (كود سوريا)
    if (phoneNumber.startsWith('0')) {
      phoneNumber = '963' + phoneNumber.substring(1);
    }
    // إذا الرقم ما بيبدأ بـ 963، أضف 963
    else if (!phoneNumber.startsWith('963')) {
      phoneNumber = '963' + phoneNumber;
    }
    
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  }

  function copyWorkerLink(worker: Worker) {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const workerLink = `${baseUrl}/warehouse/${worker.token}`;
    navigator.clipboard.writeText(workerLink);
    alert('✓ تم نسخ الرابط');
  }

  function startEdit(worker: Worker) {
    setEditingWorker(worker);
    setFormData({
      name: worker.name,
      phone: worker.phone,
      notes: worker.notes || ""
    });
    setShowAddForm(true);
  }

  function cancelEdit() {
    setEditingWorker(null);
    setFormData({ name: "", phone: "", notes: "" });
    setShowAddForm(false);
  }

  if (loading) {
    return <div className="p-8 text-center text-xl">جاري التحميل...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-primary">إدارة العمال</h1>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-primary text-white px-6 py-3 rounded-lg font-bold hover:opacity-90"
          >
            {showAddForm ? 'إلغاء' : '+ إضافة عامل جديد'}
          </button>
        </div>

        {showAddForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">
              {editingWorker ? 'تعديل بيانات العامل' : 'إضافة عامل جديد'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-lg font-bold mb-2">الاسم *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg"
                  placeholder="اسم العامل"
                  required
                />
              </div>

              <div>
                <label className="block text-lg font-bold mb-2">رقم الواتساب *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg"
                  placeholder="مثال: 0912345678"
                  required
                />
              </div>

              <div>
                <label className="block text-lg font-bold mb-2">ملاحظات</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg"
                  rows={3}
                  placeholder="أي ملاحظات إضافية..."
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-success text-white px-6 py-3 rounded-lg font-bold hover:opacity-90"
                >
                  {editingWorker ? 'حفظ التعديلات' : 'إضافة العامل'}
                </button>
                {editingWorker && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex-1 bg-gray-400 text-white px-6 py-3 rounded-lg font-bold hover:opacity-90"
                  >
                    إلغاء
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {workers.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              لا يوجد عمال مسجلين حالياً
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-primary text-white">
                  <tr>
                    <th className="px-4 py-3 text-right">الاسم</th>
                    <th className="px-4 py-3 text-right">رقم الواتساب</th>
                    <th className="px-4 py-3 text-right">السلات المجهزة</th>
                    <th className="px-4 py-3 text-right">ملاحظات</th>
                    <th className="px-4 py-3 text-right">الحالة</th>
                    <th className="px-4 py-3 text-right">تاريخ الإضافة</th>
                    <th className="px-4 py-3 text-right">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.map((worker) => (
                    <tr key={worker.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-bold">{worker.name}</td>
                      <td className="px-4 py-3">{worker.phone}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="bg-primary text-white px-3 py-1 rounded-full font-bold">
                          {stats[worker.id]?.completedBaskets || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {worker.notes || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                          worker.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {worker.is_active ? 'نشط' : 'معطل'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(worker.created_at).toLocaleDateString('ar-SY')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => openWhatsApp(worker)}
                            className="bg-green-500 text-white px-3 py-1 rounded text-sm font-bold hover:opacity-90"
                            title="فتح واتساب"
                          >
                            📱 واتساب
                          </button>
                          <button
                            onClick={() => copyWorkerLink(worker)}
                            className="bg-blue-500 text-white px-3 py-1 rounded text-sm font-bold hover:opacity-90"
                            title="نسخ الرابط"
                          >
                            📋 نسخ
                          </button>
                          <button
                            onClick={() => startEdit(worker)}
                            className="bg-warning text-white px-3 py-1 rounded text-sm font-bold hover:opacity-90"
                            title="تعديل"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => toggleWorkerStatus(worker)}
                            className={`px-3 py-1 rounded text-sm font-bold hover:opacity-90 ${
                              worker.is_active 
                                ? 'bg-gray-500 text-white' 
                                : 'bg-success text-white'
                            }`}
                            title={worker.is_active ? 'تعطيل' : 'تفعيل'}
                          >
                            {worker.is_active ? '🚫' : '✓'}
                          </button>
                          <button
                            onClick={() => resetDevice(worker)}
                            className="bg-purple-500 text-white px-3 py-1 rounded text-sm font-bold hover:opacity-90"
                            title="إعادة تعيين الجهاز"
                          >
                            📱🔄
                          </button>
                          <button
                            onClick={() => deleteWorker(worker)}
                            className="bg-error text-white px-3 py-1 rounded text-sm font-bold hover:opacity-90"
                            title="حذف"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
