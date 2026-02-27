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
  max_quantity?: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function ClaimPage() {
  const params = useParams();
  const token = params.token as string;

  const [products, setProducts] = useState<Product[]>([]);
  const [localCart, setLocalCart] = useState<{ [key: string]: number }>({});
  const [recipientName, setRecipientName] = useState("");
  const [recipientGender, setRecipientGender] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [existingOrder, setExistingOrder] = useState<any>(null);
  const [showRemovalPopup, setShowRemovalPopup] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<string | null>(null);
  const [removableProducts, setRemovableProducts] = useState<any[]>([]);
  const [linkStatus, setLinkStatus] = useState({
    active: true,
    expired: false,
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadProgress, setShowUploadProgress] = useState(false);

  useEffect(() => {
    loadData();
    // استرجاع السلة من localStorage
    const savedCart = localStorage.getItem(`cart_${token}`);
    if (savedCart) {
      setLocalCart(JSON.parse(savedCart));
    }

    // إرسال heartbeat فوري عند فتح الصفحة
    const sendHeartbeat = async () => {
      try {
        console.log('Sending heartbeat for token:', token);
        const response = await fetch(`${API_URL}/recipients/heartbeat/${token}`, {
          method: 'POST'
        });
        const data = await response.json();
        console.log('Heartbeat response:', data);
      } catch (err) {
        console.error('Heartbeat failed:', err);
      }
    };

    sendHeartbeat(); // إرسال فوري

    // Heartbeat: إرسال تحديث كل 10 ثواني
    const heartbeat = setInterval(sendHeartbeat, 10000);

    return () => clearInterval(heartbeat);
  }, []);

  async function loadData(skipLoading = false) {
    try {
      if (!skipLoading) {
        setLoading(true);
      }

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
        setRecipientGender(cartData.recipient.gender || 'male');
        setOrderSubmitted(true);

        // إذا ما في طلب = سلة افتراضية
        if (
          !cartData.recipient.orderSubmitted &&
          !cartData.recipient.order_submitted
        ) {
          setError(
            "انتهت ميزة اختيار مواد السلة، يرجى انتظار رسالة لاستلام سلة جاهزة من الجمعية. ستستلم سلة غذائية جاهزة.",
          );

          // جلب السلة الافتراضية
          try {
            const basketValue =
              cartData.recipient.basket_limit ||
              cartData.recipient.basketLimit ||
              500000;
            const defaultBasketRes = await fetch(
              `${API_URL}/default-baskets/by-value/${basketValue}`,
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
      setRecipientGender(cartData.recipient.gender || 'male');
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
      return;
    }

    if (checkResult.needsRemoval && checkResult.removableItems.length > 0) {
      setPendingProduct(productId);
      setRemovableProducts(checkResult.removableItems);
      setShowRemovalPopup(true);
      return;
    }

    setLocalCart((prev) => {
      const newCart = {
        ...prev,
        [productId]: (prev[productId] || 0) + 1,
      };
      localStorage.setItem(`cart_${token}`, JSON.stringify(newCart));
      return newCart;
    });
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
      localStorage.setItem(`cart_${token}`, JSON.stringify(newCart));
      return newCart;
    });
  }

  function handleRemoveAndAdd(removeId: string) {
    removeFromCart(removeId);

    if (pendingProduct) {
      setLocalCart((prev) => {
        const newCart = {
          ...prev,
          [pendingProduct]: (prev[pendingProduct] || 0) + 1,
        };
        localStorage.setItem(`cart_${token}`, JSON.stringify(newCart));
        return newCart;
      });
    }

    setShowRemovalPopup(false);
    setPendingProduct(null);
    setRemovableProducts([]);
  }

  async function submitOrder() {
    try {
      setError("");
      setShowUploadProgress(true);
      setUploadProgress(0);

      const isEditMode = !!existingOrder;

      if (existingOrder) {
        await fetch(
          `${API_URL}/recipients/reset-order/${token}`,
          {
            method: "POST",
          },
        );

        await fetch(`${API_URL}/orders/${existingOrder.id}`, {
          method: "DELETE",
        });

        setExistingOrder(null);
      }

      setUploadProgress(25);

      await fetch(`${API_URL}/cart/clear?token=${token}`, {
        method: "DELETE",
      });

      setUploadProgress(50);

      const items = Object.entries(localCart).map(([productId, quantity]) => ({
        productId,
        quantity
      }));

      const bulkRes = await fetch(`${API_URL}/cart/bulk-add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, items })
      });

      const bulkData = await bulkRes.json();
      if (!bulkRes.ok) {
        setError(bulkData.error || "فشل في إضافة المنتجات");
        setShowUploadProgress(false);
        return;
      }

      setUploadProgress(75);

      const data = await api.submitOrder(token);

      if (data.error) {
        setError(data.error);
        setShowUploadProgress(false);
        return;
      }

      if (isEditMode) {
        await api.requestEdit(token, "تعديل الطلب");
      }

      setUploadProgress(100);

      await new Promise(resolve => setTimeout(resolve, 1000));

      localStorage.removeItem(`cart_${token}`);
      setOrderSubmitted(true);
      await loadData(true);
      setShowUploadProgress(false);
    } catch (err) {
      console.error('Submit error:', err);
      setError("فشل في تأكيد الطلب");
      setShowUploadProgress(false);
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
      .filter((item) => item && item.price <= extra); // المواد اللي سعرها <= الفرق

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

  if (loading && !showUploadProgress) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-2xl text-gray-600">جاري التحميل...</div>
      </div>
    );
  }

  if (showUploadProgress) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" dir="rtl">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="text-2xl font-bold text-primary mb-2">
              {uploadProgress === 100 ? '✓ تم رفع الطلب بنجاح' : 'جاري رفع الطلب'}
            </div>
            <p className="text-gray-600">
              {uploadProgress === 100 
                ? 'سيتم تحويلك لصفحة الطلب...'
                : 'انتظر عدة ثوان لانتهاء التحميل وضمان رفع الطلب بشكل صحيح'
              }
            </p>
          </div>
          
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
              <div 
                className="bg-success h-full transition-all duration-500 flex items-center justify-center text-white font-bold text-sm"
                style={{ width: `${uploadProgress}%` }}
              >
                {uploadProgress}%
              </div>
            </div>
          </div>

          {/* {uploadProgress === 100 && (
            <div className="text-center text-success font-bold text-xl animate-pulse">
              ✓
            </div>
          )} */}
        </div>
      </div>
    );
  }

  if (orderSubmitted) {
    if (!existingOrder) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" dir="rtl">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="text-2xl font-bold text-primary mb-2">
                ✓ تم رفع الطلب بنجاح
              </div>
              <p className="text-gray-600">
                سيتم تحويلك لصفحة الطلب...
              </p>
            </div>
            
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                <div 
                  className="bg-success h-full transition-all duration-500 flex items-center justify-center text-white font-bold text-sm"
                  style={{ width: "100%" }}
                >
                  100%
                </div>
              </div>
            </div>
          </div>
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

    // يقدر يعدل فقط إذا: الرابط مفعّل + ما انتهت المدة
    const canEdit =
      linkStatus.active &&
      !linkStatus.expired &&
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

    async function handleDeleteOrder() {
      if (!confirm("هل أنت متأكد من حذف الطلب؟")) return;

      try {
        setLoading(true);
        await fetch(`${API_URL}/recipients/reset-order/${token}`, {
          method: "POST",
        });
        await fetch(`${API_URL}/orders/${existingOrder.id}`, {
          method: "DELETE",
        });
        setExistingOrder(null);
        setOrderSubmitted(false);
        setLocalCart({});
        // setSuccessMessage("تم حذف الطلب بنجاح");
        await loadData();
      } catch (err) {
        setError("فشل في حذف الطلب");
      } finally {
        setLoading(false);
      }
    }

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
        <div className="flex-1 overflow-y-auto p-8 pb-64">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-6">
              {existingOrder.id === "default" && (
                <div className="bg-warning text-white p-4 rounded-lg mb-6 text-center">
                  <p className="text-xl font-bold">
                    ⚠️ انتهت ميزة اختيار مواد السلة
                  </p>
                  <p className="mt-2">
                     يرجى انتظار رسالة لاستلام سلة جاهزة من الجمعية
                  </p>
                </div>
              )}

                  {!canEdit && existingOrder.id !== "default" && (
                    <div className="mt-6 border-t pt-4">
                      {!linkStatus.active ? (
                        <div className="bg-warning text-white p-4 rounded-lg text-center">
                          <p className="text-xl font-bold">
                            ⚠️ انتهت ميزة تعديل مواد السلة
                          </p>
                          <p className="mt-2">
                            يرجى انتظار رسالة لاستلام السلة من الجمعية
                          </p>
                        </div>
                      ) : (
                        <>
                          <p className="text-center text-gray-600 font-bold">
                            لا يمكن التعديل حالياً.
                          </p>
                          <p className="text-sm text-gray-500 text-center mt-2">
                            {linkStatus.expired && "انتهت مهلة التعديل."}
                            {!linkStatus.expired &&
                              existingOrder.can_edit === false &&
                              "الطلب قيد المراجعة."}
                          </p>
                        </>
                      )}
                    </div>
                  )}
              <div className="mb-4 text-center">
                <h3 className="text-2xl font-bold mb-4">{recipientName}</h3>
                <div>
                  <div className="text-sm text-gray-600 mb-1">قيمة السلة</div>
                  <div className="text-3xl font-bold text-primary">
                    {baseLimit.toLocaleString("en-US")}
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-bold mb-3">المواد:</h4>
                <div className="space-y-2">
                  {(existingOrder.order_items || existingOrder.items || []).map(
                    (item: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-gray-50 p-3 rounded"
                      >
                        <div className="font-medium mb-2">
                          {item.products?.name || item.product?.name || "منتج"}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">
                            الكمية: {item.quantity}
                          </span>
                          <span className="font-bold text-primary">
                            {(
                              item.quantity * (item.unit_price || item.unitPrice)
                            ).toLocaleString("en-US")}
                          </span>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

        {canEdit && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-primary p-4 shadow-lg">
            <div className="max-w-7xl mx-auto space-y-3">
              <button
                onClick={handleEdit}
                className="w-full bg-warning text-white py-4 rounded-lg hover:opacity-90 font-bold text-xl"
              >
                تعديل الطلب
              </button>
              <button
                onClick={handleDeleteOrder}
                className="w-full bg-error text-white py-4 rounded-lg hover:opacity-90 font-bold text-xl"
              >
                حذف الطلب
              </button>
              <p className="text-sm text-center text-warning mt-2 font-bold">
                   يرجى انتظار رسالة من الجميعة لاستلام السلة 
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-primary text-white py-6 px-4 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-base mb-2">  يرجى من <span className="font-bold text-lg">{recipientName}</span> اختيار المواد الغذائية التي تحتاجها اسرتها</h1>
          {/* <p className="text-xl">يرجى اختيار السلة الغذائية التي تحتاجها الأسرة</p> */}
        </div>
      </div>

      {!canSubmitOrder && (
        <div className="bg-white border-b-4 border-primary-light py-6 px-4 sticky top-0 z-10 shadow">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <div className="text-lg text-gray-600 mb-1">المجموع الحالي</div>
                <div className="text-4xl font-bold text-primary">
                  {cartTotal.toLocaleString("en-US")} 
                </div>
              </div>
              <div>
                <div className="text-lg text-gray-600 mb-1">المتبقي</div>
                <div className="text-4xl font-bold text-success">
                  {Math.max(0, baseLimit - cartTotal).toLocaleString("en-US")} 
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
            const maxQty = product.max_quantity || 10;
            const isDisabled = !checkResult.allowed || canSubmitOrder || quantity >= maxQty;

            return (
              <div
                key={product.id}
                className="bg-white rounded-lg shadow p-4"
              >
                <h3 className="text-xl font-bold mb-3">{product.name}</h3>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-primary">
                    {product.price.toLocaleString("en-US")} 
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
                      className={`text-2xl font-bold w-12 h-12 rounded-lg ${
                        isDisabled 
                          ? 'invisible' 
                          : 'bg-success text-white hover:opacity-90'
                      }`}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {canSubmitOrder && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-success p-4 shadow-2xl">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-2 animate-bounce">
                <p className="text-xl font-bold text-success">
                  👇 اضغط هنا لاعتماد الطلب 👇
                </p>
              </div>
              <button
                onClick={submitOrder}
                disabled={!canSubmitOrder}
                className="w-full text-2xl font-bold py-6 rounded-lg bg-success text-white hover:opacity-90 shadow-lg transform hover:scale-105 transition-all"
              >
                ✓ اعتماد الطلب ({cartItemsCount} منتج - بقيمة {baseLimit.toLocaleString("en-US")} )
              </button>
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
                ، يجب حذف أحد المواد التالية:
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
                        {item.price.toLocaleString("en-US")} 
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
