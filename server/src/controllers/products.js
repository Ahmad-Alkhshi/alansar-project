import { supabase } from '../config/supabase.js';

export const getProducts = async (req, res) => {
  try {
    const { orderType } = req.query; // 'display', 'recipient', or undefined (default)
    
    const orderField = orderType === 'recipient' ? 'recipient_order' : 'display_order';
    
    console.log('Getting products with orderType:', orderType, 'using field:', orderField);

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order(orderField, { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching products:', error);
      throw error;
    }

    console.log('Fetched', data?.length, 'products');
    res.json(data);
  } catch (error) {
    console.error('getProducts error:', error);
    res.status(500).json({ error: 'فشل في جلب المواد' });
  }
};

export const createProduct = async (req, res) => {
  try {
    const { name, price, stock, imageUrl, maxQuantity, max_quantity, unit, unit_weight } = req.body;

    const productData = { 
      name, 
      price, 
      stock, 
      image_url: imageUrl, 
      is_active: true,
      max_quantity: max_quantity || maxQuantity || 10,
      unit: unit || '1 كيلو',
      unit_weight: unit_weight || 1000
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
    const { name, price, stock, imageUrl, isActive, maxQuantity, max_quantity, unit, unit_weight } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (price !== undefined) updateData.price = price;
    if (stock !== undefined) updateData.stock = stock;
    if (imageUrl !== undefined) updateData.image_url = imageUrl;
    if (isActive !== undefined) updateData.is_active = isActive;
    if (max_quantity !== undefined) updateData.max_quantity = max_quantity;
    if (maxQuantity !== undefined) updateData.max_quantity = maxQuantity;
    if (unit !== undefined) updateData.unit = unit;
    if (unit_weight !== undefined) updateData.unit_weight = unit_weight;

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
    const { products, orderType } = req.body; // orderType: 'display' or 'recipient'

    const orderField = orderType === 'recipient' ? 'recipient_order' : 'display_order';
    
    console.log('Updating products order:', orderType, 'field:', orderField, 'products:', products.length);

    for (const product of products) {
      const { error } = await supabase
        .from('products')
        .update({ [orderField]: product.order })
        .eq('id', product.id);
        
      if (error) {
        console.error('Error updating product', product.id, error);
      }
    }

    console.log('Order update completed');
    res.json({ message: 'تم تحديث الترتيب بنجاح' });
  } catch (error) {
    console.error('updateProductsOrder error:', error);
    res.status(500).json({ error: 'فشل في تحديث الترتيب' });
  }
};
