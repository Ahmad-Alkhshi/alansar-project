import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// جلب جميع السلال الافتراضية
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('default_baskets')
      .select(`
        *,
        items:default_basket_items(
          *,
          products(*)
        )
      `)
      .order('basket_value', { ascending: true });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'فشل في جلب السلال' });
  }
});

// إنشاء سلة افتراضية جديدة
router.post('/', async (req, res) => {
  try {
    const { basket_value } = req.body;
    
    const { data, error } = await supabase
      .from('default_baskets')
      .insert([{ basket_value }])
      .select()
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'فشل في إنشاء السلة' });
  }
});

// حفظ منتجات السلة
router.post('/:id/items', async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body;
    
    // حذف المنتجات القديمة
    await supabase
      .from('default_basket_items')
      .delete()
      .eq('basket_id', id);
    
    // إضافة المنتجات الجديدة
    const itemsToInsert = Object.entries(items)
      .filter(([_, quantity]) => quantity > 0)
      .map(([product_id, quantity]) => ({
        basket_id: id,
        product_id,
        quantity
      }));
    
    if (itemsToInsert.length > 0) {
      const { error } = await supabase
        .from('default_basket_items')
        .insert(itemsToInsert);
      
      if (error) throw error;
    }
    
    res.json({ message: 'تم الحفظ' });
  } catch (error) {
    res.status(500).json({ error: 'فشل في حفظ المنتجات' });
  }
});

// جلب سلة افتراضية حسب القيمة
router.get('/by-value/:value', async (req, res) => {
  try {
    const { value } = req.params;
    
    const { data, error } = await supabase
      .from('default_baskets')
      .select(`
        *,
        items:default_basket_items(
          *,
          products(*)
        )
      `)
      .eq('basket_value', value)
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(404).json({ error: 'السلة غير موجودة' });
  }
});

export default router;
