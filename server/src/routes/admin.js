import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

router.get('/products', async (req, res) => {
  try {
    const { orderType } = req.query; // 'display', 'recipient', or undefined
    
    const orderField = orderType === 'recipient' ? 'recipient_order' : 'display_order';
    
    console.log('[Admin] Getting products with orderType:', orderType, 'using field:', orderField);

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order(orderField, { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('[Admin] Error fetching products:', error);
      throw error;
    }

    console.log('[Admin] Fetched', data?.length, 'products');
    res.json(data);
  } catch (error) {
    console.error('[Admin] getProducts error:', error);
    res.status(500).json({ error: 'فشل في جلب المواد' });
  }
});

router.post('/products/reorder', async (req, res) => {
  try {
    const { products, orderType } = req.body; // orderType: 'display' or 'recipient'

    const orderField = orderType === 'recipient' ? 'recipient_order' : 'display_order';
    
    console.log('[Admin] Updating products order:', orderType, 'field:', orderField, 'products:', products.length);

    for (const product of products) {
      const { error } = await supabase
        .from('products')
        .update({ [orderField]: product.order })
        .eq('id', product.id);
        
      if (error) {
        console.error('[Admin] Error updating product', product.id, error);
      }
    }

    console.log('[Admin] Order update completed');
    res.json({ message: 'تم تحديث الترتيب بنجاح' });
  } catch (error) {
    console.error('[Admin] updateProductsOrder error:', error);
    res.status(500).json({ error: 'فشل في تحديث الترتيب' });
  }
});

export default router;
