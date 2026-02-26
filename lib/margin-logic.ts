// Constants
export const BASE_LIMIT = 500000 // 500,000 ليرة
export const MARGIN_LIMIT = 10000 // 10,000 ليرة هامش
export const MAX_TOTAL = BASE_LIMIT + MARGIN_LIMIT // 510,000

export interface CartItem {
  productId: string
  quantity: number
  unitPrice: number
}

export interface MarginCheckResult {
  allowed: boolean
  message: string
  currentTotal: number
  smallestItemPrice?: number
  difference?: number
}

/**
 * حساب المجموع الكلي للسلة
 */
export function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
}

/**
 * إيجاد أصغر منتج في السلة (سعر × كمية)
 */
export function findSmallestItemPrice(items: CartItem[]): number | null {
  if (items.length === 0) return null
  
  const prices = items.map(item => item.unitPrice * item.quantity)
  return Math.min(...prices)
}

/**
 * التحقق من إمكانية استخدام الهامش
 * 
 * القاعدة:
 * - إذا كان المجموع <= 500,000 ✅ مسموح
 * - إذا كان المجموع > 510,000 ❌ ممنوع
 * - إذا كان المجموع بين 500,001 و 510,000:
 *   - احسب الفارق = المجموع - 500,000
 *   - ابحث عن أصغر منتج في السلة
 *   - إذا كان (سعر أصغر منتج > الفارق) ✅ يسمح بالهامش
 *   - وإلا ❌ لا يسمح (لأنه يمكن حذف منتج والوصول لـ ≤500,000)
 */
export function checkMarginAllowed(items: CartItem[]): MarginCheckResult {
  const currentTotal = calculateTotal(items)
  
  // إذا ضمن الحد الأساسي
  if (currentTotal <= BASE_LIMIT) {
    return {
      allowed: true,
      message: 'المجموع ضمن الحد المسموح',
      currentTotal,
    }
  }
  
  // إذا تجاوز الحد الأقصى
  if (currentTotal > MAX_TOTAL) {
    return {
      allowed: false,
      message: `تجاوزت الحد الأقصى المسموح (${MAX_TOTAL.toLocaleString('ar-SY')} )`,
      currentTotal,
    }
  }
  
  // بين 500,001 و 510,000 - نحتاج للتحقق من الهامش
  const difference = currentTotal - BASE_LIMIT
  const smallestItemPrice = findSmallestItemPrice(items)
  
  if (smallestItemPrice === null) {
    return {
      allowed: false,
      message: 'السلة فارغة',
      currentTotal,
    }
  }
  
  // إذا كان أصغر منتج أكبر من الفارق = لا يمكن حذفه للوصول لـ 500,000
  if (smallestItemPrice > difference) {
    return {
      allowed: true,
      message: `تم استخدام الهامش الاستثنائي (+${difference.toLocaleString('ar-SY')} )`,
      currentTotal,
      smallestItemPrice,
      difference,
    }
  }
  
  // يمكن حذف منتج والوصول لـ ≤500,000
  return {
    allowed: false,
    message: `لقد تجاوزت الـ ${BASE_LIMIT.toLocaleString('ar-SY')} . يمكنك حذف منتج صغير للبقاء ضمن الحد المسموح.`,
    currentTotal,
    smallestItemPrice,
    difference,
  }
}

/**
 * التحقق قبل إضافة منتج جديد
 */
export function canAddProduct(
  currentItems: CartItem[],
  newProduct: { productId: string; quantity: number; unitPrice: number }
): MarginCheckResult {
  const updatedItems = [...currentItems]
  
  // إذا كان المنتج موجود، نزيد الكمية
  const existingIndex = updatedItems.findIndex(
    item => item.productId === newProduct.productId
  )
  
  if (existingIndex >= 0) {
    updatedItems[existingIndex].quantity += newProduct.quantity
  } else {
    updatedItems.push(newProduct)
  }
  
  return checkMarginAllowed(updatedItems)
}

/**
 * رسالة توضيحية للمستخدم
 */
export function getMarginExplanation(): string {
  return `الحد الأساسي: ${BASE_LIMIT.toLocaleString('ar-SY')} \nيسمح بزيادة حتى ${MARGIN_LIMIT.toLocaleString('ar-SY')}  فقط في حال عدم توفر خيارات أصغر`
}
