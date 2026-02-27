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
  gender?: string
  last_seen?: string
}

export default function AdminRecipientsPage() {
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [importing, setImporting] = useState(false)
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
  const [editingRecipient, setEditingRecipient] = useState<Recipient | null>(null)
  const [formData, setFormData] = useState({ name: '', phone: '', basketLimit: '500000', gender: 'male' })
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' })
  const [showProgress, setShowProgress] = useState(false)

  useEffect(() => {
    loadRecipients()
    const interval = setInterval(() => {
      loadRecipients()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  async function loadRecipients() {
    try {
      const data = await api.getAllRecipients()
      const recipients = data.map((r: any) => ({
        ...r,
        basketLimit: r.basket_limit || r.basketLimit || 500000,
        linkDurationDays: r.link_duration_days || r.linkDurationDays || 2,
        linkActive: r.link_active !== undefined ? r.link_active : (r.linkActive !== undefined ? r.linkActive : true),
        gender: r.gender || 'male',
        last_seen: r.last_seen
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
            basketLimit: parseInt(formData.basketLimit),
            gender: formData.gender
          })
        })
        const data = await res.json()
        console.log('Response:', data)
        if (!res.ok) {
          alert('فشل في التعديل: ' + (data.error || 'خطأ غير معروف'))
          return
        }
      } else {
        await fetch(`${API_URL}/recipients`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: formData.name, 
            phone: formData.phone,
            basketLimit: parseInt(formData.basketLimit),
            gender: formData.gender
          })
        })
      }
      setFormData({ name: '', phone: '', basketLimit: '500000', gender: 'male' })
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
      basketLimit: (recipient.basketLimit || 500000).toString(),
      gender: recipient.gender || 'male'
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
    
    setShowProgress(true)
    setProgress({ current: 0, total: selectedRecipients.length, message: 'جاري الحذف...' })
    
    const BATCH_SIZE = 50
    let deletedCount = 0
    
    try {
      for (let i = 0; i < selectedRecipients.length; i += BATCH_SIZE) {
        const batch = selectedRecipients.slice(i, i + BATCH_SIZE)
        
        const res = await fetch(`${API_URL}/recipients/bulk-delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: batch })
        })
        
        const data = await res.json()
        
        if (!res.ok) {
          throw new Error(data.error || 'فشل في الحذف')
        }
        
        deletedCount += batch.length
        setProgress({ current: deletedCount, total: selectedRecipients.length, message: `جاري الحذف... ${deletedCount}/${selectedRecipients.length}` })
      }
      
      setProgress({ current: selectedRecipients.length, total: selectedRecipients.length, message: `تم حذف ${selectedRecipients.length} مستفيد` })
      setSelectedRecipients([])
      await loadRecipients()
      alert('تم الحذف بنجاح!')
    } catch (error) {
      console.error('Bulk delete error:', error)
      alert(`فشل في حذف المستفيدين بعد حذف ${deletedCount} مستفيد: ` + error)
    } finally {
      setShowProgress(false)
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

  function downloadTemplate() {
    const data = [{
      'الاسم': '',
      'رقم الملف': '',
      'الجنس': 'ذكر',
      'قيمة السلة': 500000
    }]
    
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'نموذج')
    XLSX.writeFile(wb, 'نموذج_استيراد.xlsx')
  }

  function getOnlineStatus(lastSeen?: string) {
    if (!lastSeen) return { online: false, text: 'لم يتصل بعد', color: 'text-gray-400' };
    
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMs = now.getTime() - lastSeenDate.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    console.log('Online status check:', {
      lastSeen,
      now: now.toISOString(),
      lastSeenDate: lastSeenDate.toISOString(),
      diffSeconds,
      diffMinutes,
      diffHours
    });
    
    if (diffSeconds < 30) {
      return { online: true, text: 'متصل الآن 🟢', color: 'text-green-600 font-bold' };
    } else if (diffMinutes < 1) {
      return { online: false, text: `منذ ${diffSeconds} ثانية`, color: 'text-yellow-600' };
    } else if (diffMinutes < 60) {
      return { online: false, text: `منذ ${diffMinutes} دقيقة`, color: 'text-yellow-600' };
    } else if (diffHours < 24) {
      return { online: false, text: `منذ ${diffHours} ساعة`, color: 'text-orange-600' };
    } else {
      return { online: false, text: `منذ ${diffDays} يوم`, color: 'text-gray-500' };
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
        
        const recipients = []
        for (let i = 1; i < rows.length; i++) {
          const [name, phone, gender, basketLimit] = rows[i]
          if (name && phone) {
            const genderStr = gender ? String(gender).trim() : '';
            const isFemale = genderStr === 'أنثى' || genderStr === 'انثى' || genderStr.toLowerCase() === 'female';
            recipients.push({
              name,
              phone: phone.toString(),
              gender: isFemale ? 'female' : 'male',
              basketLimit: basketLimit ? parseInt(basketLimit) : 500000
            })
          }
        }
        
        setShowProgress(true)
        setProgress({ current: 0, total: recipients.length, message: 'جاري الاستيراد...' })
        
        await fetch(`${API_URL}/recipients/bulk-create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipients })
        })
        
        setProgress({ current: recipients.length, total: recipients.length, message: `تم إضافة ${recipients.length} مستفيد` })
        
        alert('تم استيراد المستفيدين بنجاح!')
        loadRecipients()
      } catch (error) {
        alert('فشل في استيراد المستفيدين')
      } finally {
        setImporting(false)
        setShowProgress(false)
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
          <h1 className="text-3xl font-bold text-primary">إدارة المستفيدين</h1>
          <div className="flex gap-3">
            <button
              onClick={downloadTemplate}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:opacity-90"
            >
              📄 تحميل نموذج
            </button>
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
                  setFormData({ name: '', phone: '', basketLimit: '500000', gender: 'male' })
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
            <div className="grid grid-cols-4 gap-4">
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
              <select
                value={formData.gender}
                onChange={e => setFormData({ ...formData, gender: e.target.value })}
                required
                className="border p-3 rounded"
              >
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
              <input
                type="number"
                placeholder="قيمة السلة ()"
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
                <th className="p-4 text-right">الجنس</th>
                <th className="p-4 text-right">قيمة السلة</th>
                <th className="p-4 text-right">حالة الرابط</th>
                <th className="p-4 text-right">الحالة</th>
                {/* <th className="p-4 text-right">الحالة</th> */}
                <th className="p-4 text-right">الرابط</th>
              </tr>
            </thead>
            <tbody>
              {recipients.map(recipient => {
                const status = getOnlineStatus(recipient.last_seen);
                return (
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
                  <td className="p-4">{recipient.gender === 'female' ? 'أنثى' : 'ذكر'}</td>
                  <td className="p-4 font-bold text-primary">{(recipient.basketLimit || 500000).toLocaleString('ar-SY')} </td>
                  <td className="p-4">
                    <button
                      onClick={() => toggleLinkActive(recipient.id, recipient.linkActive)}
                      className={`px-4 py-2 rounded font-bold ${recipient.linkActive ? 'bg-success text-white' : 'bg-error text-white'}`}
                    >
                      {recipient.linkActive ? 'مفعّل' : 'ملغى'}
                    </button>
                  </td>
                  <td className="p-4">
                    <span className={status.color}>{status.text}</span>
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
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


