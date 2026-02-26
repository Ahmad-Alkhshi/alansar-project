import { supabase } from '../config/supabase.js';
import { validateCartAddition } from '../config/cart-validation.js';

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
        basketLimit: recipient.basket_limit || 500000,
        link_active: recipient.link_active,
        link_duration_days: recipient.link_duration_days,
        created_at: recipient.created_at
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
      .select('*, cart_items(*, products(*))')
      .eq('recipient_id', recipient.id)
      .single();

    if (!cart) {
      const { data: newCart } = await supabase
        .from('carts')
        .insert([{ recipient_id: recipient.id }])
        .select('*, cart_items(*, products(*))')
        .single();
      cart = newCart;
    }

    const existingItem = cart.cart_items.find(item => item.product_id === productId);
    const totalQuantity = (existingItem?.quantity || 0) + quantity;

    if (totalQuantity > product.stock) {
      return res.status(400).json({ error: 'الكمية المطلوبة غير متوفرة في المخزون' });
    }

    // إعداد بيانات السلة للتحقق
    const cartItemsForValidation = cart.cart_items
      .filter(item => item.product_id !== productId)
      .map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        totalPrice: item.quantity * item.unit_price,
        products: item.products
      }));
    
    // إضافة المنتج الجديد/المحدث
    if (existingItem) {
      cartItemsForValidation.push({
        product_id: productId,
        quantity: totalQuantity,
        unit_price: product.price,
        totalPrice: totalQuantity * product.price,
        products: product
      });
    } else {
      cartItemsForValidation.push({
        product_id: productId,
        quantity: quantity,
        unit_price: product.price,
        totalPrice: quantity * product.price,
        products: product
      });
    }

    // التحقق من السلة في السيرفر
    const validation = validateCartAddition(
      cart.cart_items,
      { price: product.price * quantity },
      recipient.basket_limit || 500000
    );

    if (!validation.allowed) {
      return res.status(400).json({ 
        error: validation.reason,
        removableItems: validation.removableItems
      });
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

    const newTotal = cartItemsForValidation.reduce((sum, item) => sum + item.totalPrice, 0);

    await supabase
      .from('carts')
      .update({ 
        total: newTotal,
        used_margin: validation.usedMargin || false
      })
      .eq('id', cart.id);

    const { data: updatedCart } = await supabase
      .from('carts')
      .select('*, cart_items(*, products(*))')
      .eq('id', cart.id)
      .single();

    res.json({ 
      cart: updatedCart, 
      validation: {
        usedMargin: validation.usedMargin,
        marginAmount: validation.marginAmount
      }
    });
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

export const clearCart = async (req, res) => {
  try {
    const { token } = req.query;

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

    const { data: cart } = await supabase
      .from('carts')
      .select('*')
      .eq('recipient_id', recipient.id)
      .single();

    if (cart) {
      await supabase.from('cart_items').delete().eq('cart_id', cart.id);
      await supabase.from('carts').update({ total: 0 }).eq('id', cart.id);
    }

    res.json({ message: 'تم حذف السلة' });
  } catch (error) {
    res.status(500).json({ error: 'فشل في حذف السلة' });
  }
};
