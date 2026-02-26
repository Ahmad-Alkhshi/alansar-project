import { supabase } from '../config/supabase.js';

export const getProducts = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'فشل في جلب المنتجات' });
  }
};

export const createProduct = async (req, res) => {
  try {
    const { name, price, stock, imageUrl } = req.body;

    const { data, error } = await supabase
      .from('products')
      .insert([{ name, price, stock, image_url: imageUrl, is_active: true }])
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'فشل في إضافة المنتج' });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, stock, imageUrl, isActive } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (price !== undefined) updateData.price = price;
    if (stock !== undefined) updateData.stock = stock;
    if (imageUrl !== undefined) updateData.image_url = imageUrl;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'فشل في تحديث المنتج' });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // حذف من order_items
    await supabase
      .from('order_items')
      .delete()
      .eq('product_id', id);

    // حذف من cart_items
    await supabase
      .from('cart_items')
      .delete()
      .eq('product_id', id);

    // ثم حذف المنتج نهائياً
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'تم حذف المنتج بنجاح' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'فشل في حذف المنتج' });
  }
};

export const updateProductsOrder = async (req, res) => {
  try {
    const { products } = req.body;

    for (const product of products) {
      await supabase
        .from('products')
        .update({ display_order: product.order })
        .eq('id', product.id);
    }

    res.json({ message: 'تم تحديث الترتيب بنجاح' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'فشل في تحديث الترتيب' });
  }
};
