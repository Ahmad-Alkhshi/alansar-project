import { supabase } from '../config/supabase.js';

export const getProducts = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
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

    const { data, error } = await supabase
      .from('products')
      .update({ name, price, stock, image_url: imageUrl, is_active: isActive })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'فشل في تحديث المنتج' });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'تم حذف المنتج بنجاح' });
  } catch (error) {
    res.status(500).json({ error: 'فشل في حذف المنتج' });
  }
};
