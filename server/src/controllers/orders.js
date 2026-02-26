import { supabase } from '../config/supabase.js';
import { validateOrderSubmission } from '../config/cart-validation.js';

export const submitOrder = async (req, res) => {
  try {
    const { token, isEdit } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token مطلوب' });
    }

    const { data: recipient } = await supabase
      .from('recipients')
      .select('*')
      .eq('token', token)
      .single();

    if (!recipient) {
      return res.status(404).json({ error: 'رابط غير صحيح' });
    }

    if (recipient.order_submitted && !isEdit) {
      return res.status(400).json({ error: 'تم تأكيد الطلب مسبقاً' });
    }

    const { data: cart } = await supabase
      .from('carts')
      .select('*, cart_items(*, products(*))')
      .eq('recipient_id', recipient.id)
      .single();

    if (!cart || cart.cart_items.length === 0) {
      return res.status(400).json({ error: 'السلة فارغة' });
    }

    // التحقق من صحة الطلب في السيرفر
    const cartItemsForValidation = cart.cart_items.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      totalPrice: item.quantity * item.unit_price,
      products: item.products
    }));

    const validation = validateOrderSubmission(
      cartItemsForValidation,
      recipient.basket_limit || 500000
    );

    if (!validation.allowed) {
      return res.status(400).json({ 
        error: validation.reason,
        removableItems: validation.removableItems
      });
    }

    // حفظ بيانات الطلب القديم إذا كان تعديل
    let oldOrderData = null;
    if (isEdit) {
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('*, order_items(*, products(*))')
        .eq('recipient_id', recipient.id)
        .single();
      
      if (existingOrder) {
        oldOrderData = {
          final_total: existingOrder.final_total,
          items: existingOrder.order_items
        };
      }
    }

    // التحقق من المخزون
    for (const item of cart.cart_items) {
      if (item.quantity > item.products.stock) {
        return res.status(400).json({
          error: `المنتج ${item.products.name} غير متوفر بالكمية المطلوبة`,
        });
      }
    }

    // حساب المجموع الكلي
    const finalTotal = cart.cart_items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

    // إنشاء الطلب
    const { data: order } = await supabase
      .from('orders')
      .insert([{
        recipient_id: recipient.id,
        final_total: finalTotal,
        status: isEdit ? 'pending_edit' : 'pending',
        old_order_data: oldOrderData
      }])
      .select()
      .single();

    // نقل العناصر من السلة إلى الطلب
    const orderItems = cart.cart_items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
    }));

    await supabase.from('order_items').insert(orderItems);

    // تحديث المخزون
    for (const item of cart.cart_items) {
      await supabase
        .from('products')
        .update({ stock: item.products.stock - item.quantity })
        .eq('id', item.product_id);
    }

    // تحديث حالة المستفيد
    await supabase
      .from('recipients')
      .update({ order_submitted: true })
      .eq('id', recipient.id);

    res.json({ message: 'تم تأكيد الطلب بنجاح', order });
  } catch (error) {
    res.status(500).json({ error: 'فشل في تأكيد الطلب' });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, recipients(*), order_items(*, products(*))')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'فشل في جلب الطلبات' });
  }
};
