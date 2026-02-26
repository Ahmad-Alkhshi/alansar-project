'use client'

import { API_URL } from '@/lib/config'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import * as XLSX from 'xlsx'

interface Recipient {
  id: string
  name: string
  phone: string
  token: string
  orderSubmitted: boolean
  createdAt: string
  basketLimit: number
  linkDurationDays: number
  linkActive: boolean
}

export default function AdminRecipientsPage() {
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [importing, setImporting] = useState(false)
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
  const [editingRecipient, setEditingRecipient] = useState<Recipient | null>(null)
  const [formData, setFormData] = useState({ name: '', phone: '', basketLimit: '500000' })
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  useEffect(() => {
    loadRecipients()
  }, [])

  async function loadRecipients() {
    try {
      const data = await api.getAllRecipients()
      const recipients = data.map((r: any) => ({
        ...r,
        basketLimit: r.basket_limit || r.basketLimit || 500000,
        linkDurationDays: r.link_duration_days || r.linkDurationDays || 2,
        linkActive: r.link_active !== undefined ? r.link_active : (r.linkActive !== undefined ? r.linkActive : true)
      }))
      setRecipients(recipients)
    } catch (error) {
      alert('فشل في تحميل المستفيدين')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (editingRecipient) {
        console.log('Editing recipient:', editingRecipient.id, formData)
        const res = await fetch(`${API_URL}/recipients/${editingRecipient.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: formData.name, 
            phone: formData.phone,
            basketLimit: parseInt(formData.basketLimit)
          })
        })
        const data = await res.json()
        console.log('Response:', data)
        if (!res.ok) {
          alert('فشل في التعديل: ' + (data.error || 'خطأ غير معروف'))
          return
        }
      } else {
        await fetch('${API_URL}/recipients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: formData.name, 
            phone: formData.phone,
            basketLimit: parseInt(formData.basketLimit)
          })
        })
      }
      setFormData({ name: '', phone: '', basketLimit: '500000' })
      setShowForm(false)
      setEditingRecipient(null)
      loadRecipients()
    } catch (error) {
      console.error('Submit error:', error)
      alert('فشل في حفظ المستفيد')
    }
  }

  function handleEdit(recipient: Recipient) {
    setEditingRecipient(recipient)
    setFormData({
      name: recipient.name,
      phone: recipient.phone,
      basketLimit: (recipient.basketLimit || 500000).toString()
    })
    setShowForm(true)
  }

  async function toggleLinkActive(id: string, currentStatus: boolean) {
    try {
      await fetch(`${API_URL}/recipients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkActive: !currentStatus })
      })
      loadRecipients()
    } catch (error) {
      alert('فشل في تغيير حالة الرابط')
    }
  }

  async function updateLinkDuration(id: string, days: number) {
    try {
      await fetch(`${API_URL}/recipients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkDurationDays: days })
      })
      loadRecipients()
    } catch (error) {
      alert('فشل في تحديث مدة الرابط')
    }
  }

  function copyLink(token: string) {
    const link = `${window.location.origin}/claim/${token}`
    navigator.clipboard.writeText(link)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  function toggleSelect(id: string) {
    setSelectedRecipients(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    )
  }

  function toggleSelectAll() {
    if (selectedRecipients.length === recipients.length) {
      setSelectedRecipients([])
    } else {
      setSelectedRecipients(recipients.map(r => r.id))
    }
  }

  async function bulkDelete() {
    if (selectedRecipients.length === 0) return
    if (!confirm(`هل أنت متأكد من حذف ${selectedRecipients.length} مستفيد؟`)) return
    try {
      for (const id of selectedRecipients) {
        await fetch(`${API_URL}/recipients/${id}`, { method: 'DELETE' })
      }
      setSelectedRecipients([])
      loadRecipients()
    } catch (error) {
      alert('فشل في حذف المستفيدين')
    }
  }

  function exportToExcel() {
    const data = recipients.map(r => ({
      'الاسم': r.name,
      'رقم الملف': r.phone,
      'قيمة السلة': r.basketLimit || 500000,
      'الرابط': `${window.location.origin}/claim/${r.token}`
    }))
    
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'المستفيدين')
    XLSX.writeFile(wb, 'قائمة_المستفيدين.xlsx')
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
        
        for (let i = 1; i < rows.length; i++) {
          const [name, phone, basketLimit] = rows[i]
          
          if (name && phone) {
            await fetch('${API_URL}/recipients', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                name, 
                phone: phone.toString(),
                basketLimit: basketLimit ? parseInt(basketLimit) : 500000
              })
            })
          }
        }
        
        alert('تم استيراد المستفيدين بنجاح!')
        loadRecipients()
      } catch (error) {
        alert('فشل في استيراد المستفيدين')
      } finally {
        setImporting(false)
        e.target.value = ''
      }
    }
    
    reader.readAsBinaryString(file)
  }

  if (loading) {
    return <div className="p-8 text-center">جاري التحميل...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-primary">إدارة المستفيدين</h1>
          <div className="flex gap-3">
            <label className="bg-warning text-white px-6 py-3 rounded-lg hover:opacity-90 cursor-pointer">
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
              onClick={exportToExcel}
              className="bg-success text-white px-6 py-3 rounded-lg hover:opacity-90"
            >
              📅 تصدير Excel
            </button>
            <button
              onClick={() => {
                setShowForm(!showForm)
                if (showForm) {
                  setEditingRecipient(null)
                  setFormData({ name: '', phone: '', basketLimit: '500000' })
                }
              }}
              className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark"
            >
              {showForm ? 'إلغاء' : 'إضافة مستفيد'}
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-lg mb-8">
            <h3 className="text-xl font-bold mb-4">{editingRecipient ? 'تعديل مستفيد' : 'إضافة مستفيد'}</h3>
            <div className="grid grid-cols-3 gap-4">
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
                placeholder="رقم الملف"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                required
                className="border p-3 rounded"
              />
              <input
                type="number"
                placeholder="قيمة السلة (ل.س)"
                value={formData.basketLimit}
                onChange={e => setFormData({ ...formData, basketLimit: e.target.value })}
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

        {selectedRecipients.length > 0 && (
          <div className="bg-primary-light p-4 rounded-lg mb-4 flex items-center justify-between">
            <span className="text-lg font-bold">تم تحديد {selectedRecipients.length} مستفيد</span>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  for (const id of selectedRecipients) {
                    await fetch(`${API_URL}/recipients/${id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ linkActive: true })
                    })
                  }
                  setSelectedRecipients([])
                  loadRecipients()
                }}
                className="bg-success text-white px-4 py-2 rounded-lg hover:opacity-90"
              >
                تفعيل الروابط
              </button>
              <button
                onClick={async () => {
                  for (const id of selectedRecipients) {
                    await fetch(`${API_URL}/recipients/${id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ linkActive: false })
                    })
                  }
                  setSelectedRecipients([])
                  loadRecipients()
                }}
                className="bg-warning text-white px-4 py-2 rounded-lg hover:opacity-90"
              >
                إلغاء الروابط
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
                    checked={selectedRecipients.length === recipients.length && recipients.length > 0}
                    onChange={toggleSelectAll}
                    className="w-5 h-5 cursor-pointer"
                  />
                </th>
                <th className="p-4 text-right">الاسم</th>
                <th className="p-4 text-right">رقم الملف</th>
                <th className="p-4 text-right">قيمة السلة</th>
                <th className="p-4 text-right">مدة الرابط</th>
                <th className="p-4 text-right">حالة الرابط</th>
                {/* <th className="p-4 text-right">الحالة</th> */}
                <th className="p-4 text-right">الرابط</th>
              </tr>
            </thead>
            <tbody>
              {recipients.map(recipient => (
                <tr key={recipient.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedRecipients.includes(recipient.id)}
                      onChange={() => toggleSelect(recipient.id)}
                      className="w-5 h-5 cursor-pointer"
                    />
                  </td>
                  <td className="p-4">{recipient.name}</td>
                  <td className="p-4">{recipient.phone}</td>
                  <td className="p-4 font-bold text-primary">{(recipient.basketLimit || 500000).toLocaleString('ar-SY')} ل.س</td>
                  <td className="p-4">
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={recipient.linkDurationDays}
                      onChange={(e) => updateLinkDuration(recipient.id, Number(e.target.value))}
                      className="border-2 border-gray-300 rounded px-2 py-1 w-16 text-center"
                    />
                    <span className="mr-2">يوم</span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => toggleLinkActive(recipient.id, recipient.linkActive)}
                      className={`px-4 py-2 rounded font-bold ${recipient.linkActive ? 'bg-success text-white' : 'bg-error text-white'}`}
                    >
                      {recipient.linkActive ? 'مفعّل' : 'ملغى'}
                    </button>
                  </td>
                  {/* <td className="p-4">
                    <span className={`px-3 py-1 rounded ${recipient.orderSubmitted ? 'bg-success text-white' : 'bg-warning text-white'}`}>
                      {recipient.orderSubmitted ? 'تم الإرسال' : 'لم يرسل'}
                    </span>
                  </td> */}
                  <td className="p-4">
                    <button
                      onClick={() => copyLink(recipient.token)}
                      className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark ml-2"
                    >
                      {copiedToken === recipient.token ? 'تم النسخ ✓' : 'نسخ الرابط'}
                    </button>
                    <button
                      onClick={() => handleEdit(recipient)}
                      className="bg-warning text-white px-4 py-2 rounded hover:opacity-90"
                    >
                      تعديل
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

