import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

router.get('/products', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'فشل في جلب المنتجات' });
  }
});

export default router;
