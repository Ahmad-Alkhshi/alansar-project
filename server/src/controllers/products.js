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
    res.status(500).json({ error: 'فشل في جلب المواد' });
  }
};

export const createProduct = async (req, res) => {
  try {
    const { name, price, stock, imageUrl, maxQuantity } = req.body;

    const productData = { 
      name, 
      price, 
      stock, 
      image_url: imageUrl, 
      is_active: true,
      max_quantity: maxQuantity || 10
    };

    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select()
      .single();

    if (error) {
      console.error('Create product error:', error);
      throw error;
    }

    res.json(data);
  } catch (error) {
    console.error('Create error:', error);
    res.status(500).json({ error: 'فشل في إضافة المنتج', details: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, stock, imageUrl, isActive, maxQuantity } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (price !== undefined) updateData.price = price;
    if (stock !== undefined) updateData.stock = stock;
    if (imageUrl !== undefined) updateData.image_url = imageUrl;
    if (isActive !== undefined) updateData.is_active = isActive;
    if (maxQuantity !== undefined) updateData.max_quantity = maxQuantity;

    console.log('Update product:', id, updateData);

    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    res.json(data);
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'فشل في تحديث المنتج', details: error.message });
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

export const bulkDeleteProducts = async (req, res) => {
  try {
    const { ids } = req.body;

    console.log('Bulk delete products:', ids.length, 'products');

    const batchSize = 50;
    let deleted = 0;

    // تقسيم لدفعات
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      
      for (const id of batch) {
        await supabase.from('order_items').delete().eq('product_id', id);
        await supabase.from('cart_items').delete().eq('product_id', id);
        await supabase.from('products').delete().eq('id', id);
      }
      
      deleted += batch.length;
      console.log(`Deleted ${deleted}/${ids.length}`);
    }

    res.json({ message: `تم حذف ${ids.length} منتج` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'فشل في الحذف الجماعي' });
  }
};

export const bulkCreateProducts = async (req, res) => {
  try {
    const { products } = req.body;

    const { data, error } = await supabase
      .from('products')
      .insert(products)
      .select();

    if (error) {
      console.error('Bulk create error:', error);
      throw error;
    }

    res.json({ message: `تم إضافة ${data.length} منتج`, data });
  } catch (error) {
    console.error('Bulk create error:', error);
    res.status(500).json({ error: 'فشل في الإضافة الجماعية', details: error.message });
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
