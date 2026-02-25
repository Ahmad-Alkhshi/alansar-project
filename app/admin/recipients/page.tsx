'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

interface Recipient {
  id: string
  name: string
  phone: string
  token: string
  orderSubmitted: boolean
  createdAt: string
}

export default function AdminRecipientsPage() {
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', phone: '' })

  useEffect(() => {
    loadRecipients()
  }, [])

  async function loadRecipients() {
    try {
      const data = await api.getAllRecipients()
      setRecipients(data)
    } catch (error) {
      alert('فشل في تحميل المستفيدين')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api.createRecipient(formData.name, formData.phone)
      setFormData({ name: '', phone: '' })
      setShowForm(false)
      loadRecipients()
    } catch (error) {
      alert('فشل في إضافة المستفيد')
    }
  }

  function copyLink(token: string) {
    const link = `${window.location.origin}/claim/${token}`
    navigator.clipboard.writeText(link)
    alert('تم نسخ الرابط')
  }

  if (loading) {
    return <div className="p-8 text-center">جاري التحميل...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-primary">إدارة المستفيدين</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark"
          >
            {showForm ? 'إلغاء' : 'إضافة مستفيد'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-lg mb-8">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="الاسم"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
                className="border p-3 rounded"
              />
              <input
                type="text"
                placeholder="رقم الهاتف"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                required
                className="border p-3 rounded"
              />
            </div>
            <button
              type="submit"
              className="mt-4 bg-success text-white px-6 py-3 rounded-lg hover:opacity-90"
            >
              حفظ
            </button>
          </form>
        )}

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-primary text-white">
              <tr>
                <th className="p-4 text-right">الاسم</th>
                <th className="p-4 text-right">الهاتف</th>
                <th className="p-4 text-right">الحالة</th>
                <th className="p-4 text-right">الرابط</th>
              </tr>
            </thead>
            <tbody>
              {recipients.map(recipient => (
                <tr key={recipient.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">{recipient.name}</td>
                  <td className="p-4">{recipient.phone}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded ${recipient.orderSubmitted ? 'bg-success text-white' : 'bg-warning text-white'}`}>
                      {recipient.orderSubmitted ? 'تم الإرسال' : 'لم يرسل'}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => copyLink(recipient.token)}
                      className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
                    >
                      نسخ الرابط
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
