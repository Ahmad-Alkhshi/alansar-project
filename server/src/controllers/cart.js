import { supabase } from '../config/supabase.js';
import { checkMarginAllowed } from '../config/margin-logic.js';

export const getCart = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Token مطلوب' });
    }

    const { data: recipient, error: recipientError } = await supabase
      .from('recipients')
      .select('*')
      .eq('token', token)
      .single();

    if (recipientError || !recipient) {
      return res.status(404).json({ error: 'رابط غير صحيح' });
    }

    const { data: cart } = await supabase
      .from('carts')
      .select('*, cart_items(*, products(*))')
      .eq('recipient_id', recipient.id)
      .single();

    res.json({
      cart,
      recipient: {
        id: recipient.id,
        name: recipient.name,
        phone: recipient.phone,
        orderSubmitted: recipient.order_submitted,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'فشل في جلب السلة' });
  }
};

export const addToCart = async (req, res) => {
  try {
    const { token, productId, quantity } = req.body;

    if (!token || !productId || !quantity) {
      return res.status(400).json({ error: 'بيانات ناقصة' });
    }

    const { data: recipient } = await supabase
      .from('recipients')
      .select('*')
      .eq('token', token)
      .single();

    if (!recipient) {
      return res.status(404).json({ error: 'رابط غير صحيح' });
    }

    if (recipient.order_submitted) {
      return res.status(400).json({ error: 'تم تأكيد الطلب مسبقاً' });
    }

    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (!product || !product.is_active) {
      return res.status(404).json({ error: 'المنتج غير متوفر' });
    }

    let { data: cart } = await supabase
      .from('carts')
      .select('*, cart_items(*)')
      .eq('recipient_id', recipient.id)
      .single();

    if (!cart) {
      const { data: newCart } = await supabase
        .from('carts')
        .insert([{ recipient_id: recipient.id }])
        .select('*, cart_items(*)')
        .single();
      cart = newCart;
    }

    const existingItem = cart.cart_items.find(item => item.product_id === productId);
    const totalQuantity = (existingItem?.quantity || 0) + quantity;

    if (totalQuantity > product.stock) {
      return res.status(400).json({ error: 'الكمية المطلوبة غير متوفرة في المخزون' });
    }

    const currentItems = cart.cart_items
      .filter(item => item.product_id !== productId)
      .map(item => ({
        productId: item.product_id,
        quantity: item.quantity,
        unitPrice: item.unit_price,
      }));

    currentItems.push({
      productId,
      quantity: totalQuantity,
      unitPrice: product.price,
    });

    const marginCheck = checkMarginAllowed(currentItems);

    if (!marginCheck.allowed) {
      return res.status(400).json({ error: marginCheck.message, marginCheck });
    }

    if (existingItem) {
      await supabase
        .from('cart_items')
        .update({ quantity: totalQuantity })
        .eq('id', existingItem.id);
    } else {
      await supabase
        .from('cart_items')
        .insert([{
          cart_id: cart.id,
          product_id: productId,
          quantity,
          unit_price: product.price,
        }]);
    }

    await supabase
      .from('carts')
      .update({ total: marginCheck.currentTotal })
      .eq('id', cart.id);

    const { data: updatedCart } = await supabase
      .from('carts')
      .select('*, cart_items(*, products(*))')
      .eq('id', cart.id)
      .single();

    res.json({ cart: updatedCart, marginCheck });
  } catch (error) {
    res.status(500).json({ error: 'فشل في إضافة المنتج' });
  }
};

export const removeFromCart = async (req, res) => {
  try {
    const { token, productId } = req.body;

    if (!token || !productId) {
      return res.status(400).json({ error: 'بيانات ناقصة' });
    }

    const { data: recipient } = await supabase
      .from('recipients')
      .select('*')
      .eq('token', token)
      .single();

    if (!recipient) {
      return res.status(404).json({ error: 'رابط غير صحيح' });
    }

    if (recipient.order_submitted) {
      return res.status(400).json({ error: 'تم تأكيد الطلب مسبقاً' });
    }

    const { data: cart } = await supabase
      .from('carts')
      .select('*')
      .eq('recipient_id', recipient.id)
      .single();

    if (!cart) {
      return res.status(404).json({ error: 'السلة غير موجودة' });
    }

    await supabase
      .from('cart_items')
      .delete()
      .eq('cart_id', cart.id)
      .eq('product_id', productId);

    const { data: remainingItems } = await supabase
      .from('cart_items')
      .select('*')
      .eq('cart_id', cart.id);

    const newTotal = remainingItems.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0
    );

    await supabase
      .from('carts')
      .update({ total: newTotal })
      .eq('id', cart.id);

    const { data: updatedCart } = await supabase
      .from('carts')
      .select('*, cart_items(*, products(*))')
      .eq('id', cart.id)
      .single();

    res.json({ cart: updatedCart });
  } catch (error) {
    res.status(500).json({ error: 'فشل في حذف المنتج' });
  }
};
