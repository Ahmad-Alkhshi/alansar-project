import express from 'express';
import { submitOrder, getAllOrders } from '../controllers/orders.js';
import { supabase } from '../config/supabase.js';

const router = express.Router();

router.post('/', submitOrder);
router.get('/', getAllOrders);

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // جلب عناصر الطلب لإرجاع المخزون
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('*, products(*)')
      .eq('order_id', id);
    
    // إرجاع المخزون
    if (orderItems) {
      for (const item of orderItems) {
        await supabase
          .from('products')
          .update({ stock: item.products.stock + item.quantity })
          .eq('id', item.product_id);
      }
    }
    
    // حذف عناصر الطلب
    await supabase.from('order_items').delete().eq('order_id', id);
    
    // حذف الطلب
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) throw error;
    
    res.json({ message: 'تم حذف الطلب' });
  } catch (error) {
    res.status(500).json({ error: 'فشل في حذف الطلب' });
  }
});

// طلب تعديل الطلب
router.post('/request-edit', async (req, res) => {
  try {
    const { token, reason } = req.body;
    console.log('Received edit request:', { token, reason });
    
    const { data: recipient, error: recipientError } = await supabase
      .from('recipients')
      .select('id')
      .eq('token', token)
      .single();
    
    console.log('Recipient:', recipient, 'Error:', recipientError);
    
    if (!recipient) return res.status(404).json({ error: 'مستفيد غير موجود' });
    
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, can_edit')
      .eq('recipient_id', recipient.id)
      .single();
    
    console.log('Order:', order, 'Error:', orderError);
    
    if (!order) return res.status(404).json({ error: 'لا يوجد طلب' });
    
    const { data, error } = await supabase
      .from('edit_requests')
      .insert({ order_id: order.id, reason })
      .select()
      .single();
    
    console.log('Insert result:', data, 'Error:', error);
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error in request-edit:', error);
    res.status(500).json({ error: 'فشل في إرسال الطلب', details: error.message });
  }
});

// جلب طلبات التعديل
router.get('/edit-requests', async (req, res) => {
  try {
    console.log('Fetching edit requests...');
    const { data, error } = await supabase
      .from('edit_requests')
      .select(`
        *,
        orders (
          id,
          final_total,
          recipients (
            name,
            phone
          )
        )
      `)
      .order('created_at', { ascending: false });
    
    console.log('Edit requests:', data, 'Error:', error);
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching edit requests:', error);
    res.status(500).json({ error: 'فشل في جلب الطلبات' });
  }
});

// قبول طلب التعديل
router.post('/edit-requests/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: request } = await supabase
      .from('edit_requests')
      .select('order_id')
      .eq('id', id)
      .single();
    
    if (!request) return res.status(404).json({ error: 'طلب غير موجود' });
    
    // تحديث حالة الطلب
    await supabase
      .from('edit_requests')
      .update({ status: 'approved', updated_at: new Date() })
      .eq('id', id);
    
    // السماح بالتعديل
    await supabase
      .from('orders')
      .update({ can_edit: true })
      .eq('id', request.order_id);
    
    res.json({ message: 'تم قبول الطلب' });
  } catch (error) {
    res.status(500).json({ error: 'فشل في قبول الطلب' });
  }
});

// رفض طلب التعديل
router.post('/edit-requests/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    
    await supabase
      .from('edit_requests')
      .update({ status: 'rejected', updated_at: new Date() })
      .eq('id', id);
    
    res.json({ message: 'تم رفض الطلب' });
  } catch (error) {
    res.status(500).json({ error: 'فشل في رفض الطلب' });
  }
});

// تعطيل التعديل بعد إرسال طلب تعديل
router.post('/disable-edit/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const { data: recipient } = await supabase
      .from('recipients')
      .select('id')
      .eq('token', token)
      .single();
    
    if (!recipient) return res.status(404).json({ error: 'مستفيد غير موجود' });
    
    await supabase
      .from('orders')
      .update({ can_edit: false })
      .eq('recipient_id', recipient.id);
    
    res.json({ message: 'تم تعطيل التعديل' });
  } catch (error) {
    res.status(500).json({ error: 'فشل في تعطيل التعديل' });
  }
});

export default router;