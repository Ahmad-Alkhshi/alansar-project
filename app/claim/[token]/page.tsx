"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  imageUrl: string | null;
}

export default function ClaimPage() {
  const params = useParams();
  const token = params.token as string;

  const [products, setProducts] = useState<Product[]>([]);
  const [localCart, setLocalCart] = useState<{ [key: string]: number }>({});
  const [recipientName, setRecipientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [existingOrder, setExistingOrder] = useState<any>(null);
  const [showRemovalPopup, setShowRemovalPopup] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<string | null>(null);
  const [removableProducts, setRemovableProducts] = useState<any[]>([]);
  const [linkStatus, setLinkStatus] = useState({
    active: true,
    expired: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const productsData = await api.getProducts();
      setProducts(productsData);

      const cartData = await api.getCart(token);

      if (cartData.error) {
        setError(cartData.error);
        return;
      }

      // التحقق من حالة الرابط
      const linkActive =
        cartData.recipient.link_active !== undefined
          ? cartData.recipient.link_active
          : true;
      const linkDurationDays = cartData.recipient.link_duration_days || 2;
      const createdAt = new Date(
        cartData.recipient.created_at || cartData.recipient.createdAt,
      );
      const now = new Date();
      const daysPassed = Math.floor(
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      const linkExpired = daysPassed >= linkDurationDays;

      setLinkStatus({ active: linkActive, expired: linkExpired });

      // إذا الرابط ملغى أو منتهي
      if (!linkActive || linkExpired) {
        setRecipientName(cartData.recipient.name);
        setOrderSubmitted(true);

        // إذا ما في طلب = سلة افتراضية
        if (
          !cartData.recipient.orderSubmitted &&
          !cartData.recipient.order_submitted
        ) {
          setError(
            "انتهت مدة ميزة اختيار المنتجات. ستستلم سلة غذائية افتراضية.",
          );

          // جلب السلة الافتراضية
          try {
            const basketValue =
              cartData.recipient.basket_limit ||
              cartData.recipient.basketLimit ||
              500000;
            const defaultBasketRes = await fetch(
              `http://localhost:5000/api/default-baskets/by-value/${basketValue}`,
            );
            const defaultBasket = await defaultBasketRes.json();

            if (defaultBasket && defaultBasket.items) {
              setExistingOrder({
                id: "default",
                final_total: basketValue,
                order_items: defaultBasket.items.map((item: any) => ({
                  id: item.id,
                  product_id: item.product_id,
                  quantity: item.quantity,
                  unit_price: item.products.price,
                  products: item.products,
                })),
                recipients: {
                  name: cartData.recipient.name,
                  phone: cartData.recipient.phone,
                },
              });
            } else {
              setExistingOrder({
                id: "default",
                final_total: basketValue,
                order_items: [],
                recipients: {
                  name: cartData.recipient.name,
                  phone: cartData.recipient.phone,
                },
              });
            }
          } catch (err) {
            setExistingOrder({
              id: "default",
              final_total: cartData.recipient.basket_limit || 500000,
              order_items: [],
              recipients: {
                name: cartData.recipient.name,
                phone: cartData.recipient.phone,
              },
            });
          }

          setLoading(false);
          return;
        }
      }

      setRecipientName(cartData.recipient.name);
      setOrderSubmitted(cartData.recipient.orderSubmitted);
      setBaseLimit(
        cartData.recipient.basket_limit ||
          cartData.recipient.basketLimit ||
          500000,
      );

      // إذا كان مسجل مسبقاً، جلب الطلب
      if (
        cartData.recipient.orderSubmitted ||
        cartData.recipient.order_submitted
      ) {
        const ordersData = await api.getAllOrders();
        const userOrder = ordersData.find(
          (o: any) =>
            o.recipient_id === cartData.recipient.id ||
            o.recipientId === cartData.recipient.id,
        );
        if (userOrder) {
          setExistingOrder(userOrder);

          // جلب آخر طلب تعديل
          const editRequests = await api.getEditRequests();
          const userEditRequest = editRequests.find(
            (r: any) => r.order_id === userOrder.id,
          );
          if (userEditRequest) {
            if (userEditRequest.status === "approved") {
              setSuccessMessage(
                "تم قبول طلب التعديل من قبل الإدارة. يمكنك التعديل الآن.",
              );
            } else if (userEditRequest.status === "rejected") {
              setError("تم رفض طلب التعديل من قبل الإدارة.");
            }
          }
        }
      }
    } catch (err) {
      setError("فشل في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }

  function addToCart(productId: string) {
    setError("");

    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const checkResult = canAddProduct(product.price);

    if (!checkResult.allowed) {
      return; // الزر معطل أصلاً
    }

    if (checkResult.needsRemoval && checkResult.removableItems.length > 0) {
      // إظهار القائمة المنبثقة
      setPendingProduct(productId);
      setRemovableProducts(checkResult.removableItems);
      setShowRemovalPopup(true);
      return;
    }

    // إضافة عادية
    setLocalCart((prev) => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1,
    }));
  }

  function removeFromCart(productId: string) {
    setError("");
    setLocalCart((prev) => {
      const newCart = { ...prev };
      if (newCart[productId] > 1) {
        newCart[productId]--;
      } else {
        delete newCart[productId];
      }
      return newCart;
    });
  }

  function handleRemoveAndAdd(removeId: string) {
    // حذف المنتج القديم
    removeFromCart(removeId);

    // إضافة المنتج الجديد
    if (pendingProduct) {
      setLocalCart((prev) => ({
        ...prev,
        [pendingProduct]: (prev[pendingProduct] || 0) + 1,
      }));
    }

    // إغلاق القائمة
    setShowRemovalPopup(false);
    setPendingProduct(null);
    setRemovableProducts([]);
  }

  async function submitOrder() {
    try {
      setError("");
      setLoading(true);

      const isEditMode = !!existingOrder;

      if (existingOrder) {
        await fetch(
          `http://localhost:5000/api/recipients/reset-order/${token}`,
          {
            method: "POST",
          },
        );

        await fetch(`http://localhost:5000/api/orders/${existingOrder.id}`, {
          method: "DELETE",
        });

        setExistingOrder(null);
      }

      await fetch(`http://localhost:5000/api/cart/clear?token=${token}`, {
        method: "DELETE",
      });

      for (const [productId, quantity] of Object.entries(localCart)) {
        const res = await api.addToCart(token, productId, quantity);
        if (res.error) {
          setError(res.error);
          setLoading(false);
          return;
        }
      }

      const data = await api.submitOrder(token);

      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      if (isEditMode) {
        await api.requestEdit(token, "تعديل الطلب");

        // تعيين can_edit = false بعد التعديل
        await fetch(`http://localhost:5000/api/orders/disable-edit/${token}`, {
          method: "POST",
        });
      }

      setOrderSubmitted(true);
      await loadData();

      setSuccessMessage(
        isEditMode
          ? "تم تعديل الطلب بنجاح! سيتم مراجعته من قبل الإدارة."
          : "تم تأكيد طلبك بنجاح! شكراً لك.",
      );
    } catch (err) {
      setError("فشل في تأكيد الطلب");
    } finally {
      setLoading(false);
    }
  }

  function canAddProduct(productPrice: number): {
    allowed: boolean;
    needsRemoval: boolean;
    removableItems: any[];
  } {
    const newTotal = cartTotal + productPrice;

    // إذا ضمن الحد الأساسي
    if (newTotal <= baseLimit) {
      return { allowed: true, needsRemoval: false, removableItems: [] };
    }

    // إذا تجاوز السقف الأقصى
    if (newTotal > maxLimit) {
      return { allowed: false, needsRemoval: false, removableItems: [] };
    }

    // ضمن نطاق الهامش - نتحقق من الشرط
    const extra = newTotal - baseLimit;

    // حساب أصغر منتج في السلة بعد الإضافة
    const cartPrices = Object.entries(localCart)
      .map(([id, qty]) => {
        const p = products.find((pr) => pr.id === id);
        return p ? p.price : 0;
      })
      .filter((price) => price > 0);

    cartPrices.push(productPrice);
    const smallestPrice = Math.min(...cartPrices);

    // شرط الهامش: أصغر منتج > الفرق
    if (smallestPrice > extra) {
      return { allowed: true, needsRemoval: false, removableItems: [] };
    }

    // الشرط غير محقق - نحتاج حذف منتجات
    const itemsToRemove = Object.entries(localCart)
      .map(([id, qty]) => {
        const p = products.find((pr) => pr.id === id);
        return p
          ? { id: p.id, name: p.name, price: p.price, quantity: qty }
          : null;
      })
      .filter((item) => item && item.price <= extra); // المنتجات اللي سعرها <= الفرق

    return { allowed: true, needsRemoval: true, removableItems: itemsToRemove };
  }

  function getCartQuantity(productId: string): number {
    return localCart[productId] || 0;
  }

  const cartTotal = Object.entries(localCart).reduce(
    (sum, [productId, quantity]) => {
      const product = products.find((p) => p.id === productId);
      return sum + (product ? product.price * quantity : 0);
    },
    0,
  );

  const cartItemsCount = Object.values(localCart).reduce(
    (sum, qty) => sum + qty,
    0,
  );
  const [baseLimit, setBaseLimit] = useState(500000);
  const exceptionalMargin = 10000;
  const maxLimit = baseLimit + exceptionalMargin;
  const remaining = baseLimit - cartTotal;
  const difference = cartTotal - baseLimit;

  // حساب أصغر منتج
  const smallestItemPrice =
    Object.keys(localCart).length > 0
      ? Math.min(
          ...Object.keys(localCart).map(
            (id) => products.find((p) => p.id === id)?.price || Infinity,
          ),
        )
      : Infinity;

  // التحقق من الهامش
  const isMarginAllowed =
    cartTotal <= baseLimit ||
    (difference <= exceptionalMargin && smallestItemPrice > difference);

  // التحقق من إمكانية رفع الطلب: لازم يكون وصل للحد أو تجاوزه بشكل صحيح
  const canSubmitOrder = cartTotal >= baseLimit && isMarginAllowed;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-2xl text-gray-600">جاري التحميل...</div>
      </div>
    );
  }

  if (orderSubmitted) {
    if (!existingOrder) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="text-2xl text-gray-600">جاري تحميل الطلب...</div>
        </div>
      );
    }

    // حساب إذا لسه يقدر يعدل
    const orderDate = new Date(
      existingOrder.created_at || existingOrder.createdAt,
    );
    const now = new Date();
    const daysPassed = Math.floor(
      (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const editDeadlineDays = 2;

    // يقدر يعدل فقط إذا: الرابط مفعّل + ما انتهت المدة + can_edit = true
    const canEdit =
      linkStatus.active &&
      !linkStatus.expired &&
      existingOrder.can_edit !== false &&
      daysPassed < editDeadlineDays;

    console.log(
      "Order View - linkStatus:",
      linkStatus,
      "canEdit:",
      canEdit,
      "daysPassed:",
      daysPassed,
    );

    function handleEdit() {
      const cartFromOrder: { [key: string]: number } = {};
      (existingOrder.order_items || existingOrder.items || []).forEach(
        (item: any) => {
          const productId = item.product_id || item.productId;
          cartFromOrder[productId] = item.quantity;
        },
      );
      setLocalCart(cartFromOrder);
      setOrderSubmitted(false);
    }

    return (
      <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            {existingOrder.id === "default" && (
              <div className="bg-warning text-white p-4 rounded-lg mb-6 text-center">
                <p className="text-xl font-bold">
                  ⚠️ انتهت مدة ميزة الاختيار من السلة
                </p>
                <p className="mt-2">
                  ستستلم سلة غذائية افتراضية بالمنتجات التالية:
                </p>
              </div>
            )}

            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-bold mb-2">{recipientName}</h3>
                <p className="text-gray-600">
                  {existingOrder.recipients?.phone ||
                    existingOrder.recipient?.phone}
                </p>
                {existingOrder.id !== "default" && (
                  <p className="text-sm text-gray-500 mt-2">
                    {new Date(
                      existingOrder.created_at || existingOrder.createdAt,
                    ).toLocaleString("ar-SY")}
                  </p>
                )}
                {canEdit && (
                  <p className="text-sm text-warning mt-2 font-bold">
                    يمكنك التعديل خلال {editDeadlineDays - daysPassed} يوم
                  </p>
                )}
              </div>
              <div className="text-left">
                <div className="text-3xl font-bold text-primary mb-2">
                  {(
                    existingOrder.final_total ||
                    existingOrder.finalTotal ||
                    0
                  ).toLocaleString("ar-SY")}{" "}
                  ل.س
                </div>
                <span className="px-4 py-2 rounded text-white bg-gray-400">
                  قيد التحضير
                </span>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-bold mb-3">المنتجات:</h4>
              <div className="space-y-2">
                {(existingOrder.order_items || existingOrder.items || []).map(
                  (item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center bg-gray-50 p-3 rounded"
                    >
                      <span className="font-medium">
                        {item.products?.name || item.product?.name || "منتج"}
                      </span>
                      <div className="flex gap-4 items-center">
                        <span className="text-gray-600">
                          الكمية: {item.quantity}
                        </span>
                        <span className="text-gray-600">
                          {(item.unit_price || item.unitPrice).toLocaleString(
                            "ar-SY",
                          )}{" "}
                          ل.س
                        </span>
                        <span className="font-bold text-primary">
                          {(
                            item.quantity * (item.unit_price || item.unitPrice)
                          ).toLocaleString("ar-SY")}{" "}
                          ل.س
                        </span>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>

            {canEdit && (
              <div className="mt-6 border-t pt-4">
                <button
                  onClick={handleEdit}
                  className="w-full bg-warning text-white py-4 rounded-lg hover:opacity-90 font-bold text-xl"
                >
                  تعديل الطلب
                </button>
                <p className="text-sm text-gray-500 text-center mt-2">
                  يمكنك التعديل خلال {editDeadlineDays - daysPassed} يوم
                </p>
              </div>
            )}

            {!canEdit && existingOrder.id !== "default" && (
              <div className="mt-6 border-t pt-4">
                <p className="text-center text-gray-600 font-bold">
                  لا يمكن التعديل حالياً.
                </p>
                <p className="text-sm text-gray-500 text-center mt-2">
                  {!linkStatus.active && "تم إلغاء الرابط من قبل الإدارة."}
                  {linkStatus.expired && "انتهت مهلة التعديل."}
                  {!linkStatus.active &&
                    !linkStatus.expired &&
                    existingOrder.can_edit === false &&
                    "الطلب قيد المراجعة."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-primary text-white py-6 px-4 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">مرحباً {recipientName}</h1>
          <p className="text-xl">اختر المواد الغذائية التي تحتاجها</p>
        </div>
      </div>

      <div className="bg-white border-b-4 border-primary-light py-6 px-4 sticky top-0 z-10 shadow">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="text-lg text-gray-600 mb-1">المجموع الحالي</div>
              <div className="text-4xl font-bold text-primary">
                {cartTotal.toLocaleString("ar-SY")} ل.س
              </div>
            </div>
            <div>
              <div className="text-lg text-gray-600 mb-1">المتبقي</div>
              <div
                className={`text-4xl font-bold ${remaining >= 0 ? "text-success" : "text-secondary"}`}
              >
                {remaining.toLocaleString("ar-SY")} ل.س
              </div>
            </div>
          </div>

          {cartTotal > baseLimit && (
            <div className="bg-secondary-light text-white p-4 rounded-lg text-lg">
              تم استخدام الهامش الاستثنائي (+
              {(cartTotal - baseLimit).toLocaleString("ar-SY")} ل.س)
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="bg-error text-white p-4 rounded-lg text-xl">
            {error}
          </div>
        </div>
      )}

      {successMessage && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="bg-success text-white p-4 rounded-lg text-xl">
            {successMessage}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8 pb-32">
        <div className="space-y-3">
          {products.map((product) => {
            const quantity = getCartQuantity(product.id);
            const checkResult = canAddProduct(product.price);
            const isDisabled = !checkResult.allowed;

            return (
              <div
                key={product.id}
                className="bg-white rounded-lg shadow p-4 flex items-center justify-between gap-3"
              >
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-1">{product.name}</h3>
                  <div className="text-2xl font-bold text-primary">
                    {product.price.toLocaleString("ar-SY")} ل.س
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => removeFromCart(product.id)}
                    disabled={quantity === 0}
                    className="bg-error text-white text-2xl font-bold w-12 h-12 rounded-lg hover:opacity-90 disabled:opacity-30"
                  >
                    -
                  </button>
                  <div className="text-2xl font-bold text-primary min-w-[50px] text-center bg-gray-100 rounded-lg px-3 py-2">
                    {quantity}
                  </div>
                  <button
                    onClick={() => addToCart(product.id)}
                    disabled={isDisabled}
                    className="bg-success text-white text-2xl font-bold w-12 h-12 rounded-lg hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {cartItemsCount > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-primary p-4 shadow-lg">
            <div className="max-w-7xl mx-auto">
              <button
                onClick={() => setShowSummary(true)}
                disabled={!canSubmitOrder}
                className={`w-full text-2xl font-bold py-4 rounded-lg ${
                  canSubmitOrder
                    ? "bg-success text-white hover:opacity-90"
                    : "bg-gray-400 text-white opacity-50 cursor-not-allowed"
                }`}
              >
                {canSubmitOrder
                  ? `رفع الطلب (${cartItemsCount} منتج - ${cartTotal.toLocaleString("ar-SY")} ل.س)`
                  : cartTotal < baseLimit
                    ? `لازم تكمل للحد المطلوب (${baseLimit.toLocaleString("ar-SY")} ل.س)`
                    : "لا يمكن رفع الطلب - تجاوز الحد المسموح"}
              </button>
            </div>
          </div>
        )}

        {showSummary && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <h2 className="text-3xl font-bold mb-6 text-center">
                ملخص الطلب
              </h2>

              <div className="space-y-3 mb-6">
                {Object.entries(localCart).map(([productId, quantity]) => {
                  const product = products.find((p) => p.id === productId);
                  if (!product) return null;
                  return (
                    <div
                      key={productId}
                      className="flex justify-between items-center bg-gray-50 p-4 rounded-lg"
                    >
                      <div>
                        <div className="font-bold text-lg">{product.name}</div>
                        <div className="text-gray-600">الكمية: {quantity}</div>
                      </div>
                      <div className="text-xl font-bold text-primary">
                        {(product.price * quantity).toLocaleString("ar-SY")} ل.س
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t-2 pt-4 mb-6">
                <div className="flex justify-between items-center text-2xl font-bold">
                  <span>المجموع الكلي:</span>
                  <span className="text-primary">
                    {cartTotal.toLocaleString("ar-SY")} ل.س
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowSummary(false)}
                  className="flex-1 bg-gray-400 text-white text-xl font-bold py-4 rounded-lg hover:opacity-90"
                >
                  تعديل
                </button>
                <button
                  onClick={() => {
                    setShowSummary(false);
                    submitOrder();
                  }}
                  className="flex-1 bg-success text-white text-xl font-bold py-4 rounded-lg hover:opacity-90"
                >
                  تأكيد الطلب
                </button>
              </div>
            </div>
          </div>
        )}

        {showRemovalPopup && pendingProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] flex flex-col">
              <h2 className="text-2xl font-bold mb-4 text-center text-error">
                يجب حذف منتج للمتابعة
              </h2>
              <p className="text-lg mb-6 text-center text-gray-700">
                لإضافة{" "}
                <span className="font-bold text-primary">
                  {products.find((p) => p.id === pendingProduct)?.name}
                </span>
                ، يجب حذف أحد المنتجات التالية:
              </p>

              <div className="space-y-3 mb-6 overflow-y-auto flex-1">
                {removableProducts.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border-2 border-gray-200"
                  >
                    <div>
                      <div className="font-bold text-lg">{item.name}</div>
                      <div className="text-gray-600">
                        الكمية: {item.quantity}
                      </div>
                      <div className="text-primary font-bold">
                        {item.price.toLocaleString("ar-SY")} ل.س
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveAndAdd(item.id)}
                      className="bg-error text-white px-6 py-3 rounded-lg hover:opacity-90 font-bold"
                    >
                      حذف وإضافة
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  setShowRemovalPopup(false);
                  setPendingProduct(null);
                  setRemovableProducts([]);
                }}
                className="w-full bg-gray-400 text-white py-3 rounded-lg hover:opacity-90 font-bold"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
