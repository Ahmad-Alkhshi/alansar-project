const BASE_LIMIT = 500000;
const EXCEPTIONAL_MARGIN = 10000;

export function checkMarginAllowed(cartItems) {
  const currentTotal = cartItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  if (currentTotal <= BASE_LIMIT) {
    return {
      allowed: true,
      currentTotal,
      difference: 0,
      message: 'ضمن الحد المسموح',
    };
  }

  const difference = currentTotal - BASE_LIMIT;

  if (difference > EXCEPTIONAL_MARGIN) {
    return {
      allowed: false,
      currentTotal,
      difference,
      message: `تجاوز الحد المسموح (${difference.toLocaleString()} )`,
    };
  }

  const smallestItem = cartItems.reduce((min, item) =>
    item.unitPrice < min ? item.unitPrice : min,
    Infinity
  );

  if (smallestItem > difference) {
    return {
      allowed: true,
      currentTotal,
      difference,
      smallestItem,
      message: 'مسموح بالهامش الاستثنائي',
    };
  }

  return {
    allowed: false,
    currentTotal,
    difference,
    smallestItem,
    message: `لا يمكن تجاوز الحد. أصغر منتج (${smallestItem.toLocaleString()}) أقل من الفارق (${difference.toLocaleString()})`,
  };
}
