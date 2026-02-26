export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl text-center">
        <h1 className="text-4xl font-bold text-primary mb-6">
          نظام توزيع السلات الغذائية
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          مرحباً بك في نظام إدارة توزيع السلات الغذائية
        </p>
        <div className="bg-primary-light text-white p-6 rounded-lg">
          <p className="text-lg">
            إذا كنت مستفيداً، استخدم الرابط الخاص الذي تم إرساله لك
          </p>
        </div>
      </div>
    </div>
  )
}

