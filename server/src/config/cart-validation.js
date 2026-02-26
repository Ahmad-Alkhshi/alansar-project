// منطق التحقق من إضافة منتج للسلة
// جميع الحسابات تتم في السيرفر فقط

const BASE_LIMIT = 500000;
const MARGIN = 10000;
const MAX_LIMIT = BASE_LIMIT + MARGIN; // 510000

/**
 * التحقق من إمكانية حذف مجموعة عناصر لتجنب استخدام الهامش
 * باستخدام خوارزمية subset sum
 */
function canRemoveItemsToAvoidMargin(cartItems, targetSum) {
  const n = cartItems.length;
  
  // جرب جميع المجموعات الممكنة
  for (let i = 1; i < (1 << n); i++) {
    let sum = 0;
    const removedItems = [];
    
    for (let j = 0; j < n; j++) {
      if (i & (1 << j)) {
        sum += cartItems[j].totalPrice;
        removedItems.push(cartItems[j]);
      }
    }
    
    if (sum === targetSum) {
      return { possible: true, items: removedItems };
    }
  }
  
  return { possible: false, items: [] };
}

/**
 * التحقق من إمكانية إضافة منتج للسلة
 */
export function validateCartAddition(cartItems, productToAdd, recipientBasketLimit = BASE_LIMIT) {
  // حساب المجموع الحالي
  const currentTotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
  
  // حساب المجموع الجديد بعد الإضافة
  const newTotal = currentTotal + productToAdd.price;
  
  // الحالة 1: ضمن الحد الأساسي
  if (newTotal <= recipientBasketLimit) {
    return {
      allowed: true,
      usedMargin: false
    };
  }
  
  // الحالة 2: تجاوز السقف الأقصى
  const maxLimit = recipientBasketLimit + MARGIN;
  if (newTotal > maxLimit) {
    return {
      allowed: false,
      reason: `تجاوز الحد الأقصى المسموح (${maxLimit.toLocaleString('ar-SY')} ل.س)`
    };
  }
  
  // الحالة 3: ضمن نطاق الهامش (BASE_LIMIT < newTotal <= MAX_LIMIT)
  // نحتاج للتحقق: هل يمكن حذف عناصر لتجنب استخدام الهامش؟
  
  const extra = newTotal - recipientBasketLimit;
  
  // تحويل السلة لصيغة مناسبة للخوارزمية
  const itemsWithPrices = cartItems.map(item => ({
    id: item.product_id || item.productId,
    name: item.products?.name || item.product?.name || 'منتج',
    quantity: item.quantity,
    unitPrice: item.unit_price || item.unitPrice,
    totalPrice: (item.unit_price || item.unitPrice) * item.quantity
  }));
  
  // التحقق من إمكانية حذف عناصر
  const removalCheck = canRemoveItemsToAvoidMargin(itemsWithPrices, extra);
  
  if (removalCheck.possible) {
    // يمكن حذف عناصر لتجنب الهامش - نرفض الإضافة
    return {
      allowed: false,
      reason: 'يمكنك حذف العناصر التالية للشراء دون استخدام الهامش',
      removableItems: removalCheck.items.map(item => ({
        name: item.name,
        price: item.totalPrice
      }))
    };
  }
  
  // لا يمكن تجنب الهامش - نسمح باستخدامه
  return {
    allowed: true,
    usedMargin: true,
    marginAmount: extra
  };
}

/**
 * التحقق من إمكانية تأكيد الطلب
 */
export function validateOrderSubmission(cartItems, recipientBasketLimit = BASE_LIMIT) {
  const total = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
  
  // يجب أن يكون المجموع >= الحد الأساسي
  if (total < recipientBasketLimit) {
    return {
      allowed: false,
      reason: `يجب إكمال المشتريات للوصول إلى ${recipientBasketLimit.toLocaleString('ar-SY')} ل.س`
    };
  }
  
  // يجب ألا يتجاوز السقف الأقصى
  const maxLimit = recipientBasketLimit + MARGIN;
  if (total > maxLimit) {
    return {
      allowed: false,
      reason: `تجاوز الحد الأقصى المسموح (${maxLimit.toLocaleString('ar-SY')} ل.س)`
    };
  }
  
  // إذا استخدم الهامش، نتحقق من الشرط
  if (total > recipientBasketLimit) {
    const extra = total - recipientBasketLimit;
    const itemsWithPrices = cartItems.map(item => ({
      id: item.product_id || item.productId,
      name: item.products?.name || item.product?.name || 'منتج',
      quantity: item.quantity,
      unitPrice: item.unit_price || item.unitPrice,
      totalPrice: (item.unit_price || item.unitPrice) * item.quantity
    }));
    
    const removalCheck = canRemoveItemsToAvoidMargin(itemsWithPrices, extra);
    
    if (removalCheck.possible) {
      return {
        allowed: false,
        reason: 'يجب حذف بعض العناصر لتجنب استخدام الهامش',
        removableItems: removalCheck.items.map(item => ({
          name: item.name,
          price: item.totalPrice
        }))
      };
    }
  }
  
  return {
    allowed: true,
    total,
    usedMargin: total > recipientBasketLimit
  };
}
