import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

router.get('/products', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'فشل في جلب المواد' });
  }
});

router.post('/products/reorder', async (req, res) => {
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
});

export default router;
