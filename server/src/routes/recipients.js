import express from 'express';
import { createRecipient, getAllRecipients } from '../controllers/recipients.js';
import { supabase } from '../config/supabase.js';

const router = express.Router();

router.post('/', createRecipient);
router.get('/', getAllRecipients);

router.post('/reset-order/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const { error } = await supabase
      .from('recipients')
      .update({ order_submitted: false })
      .eq('token', token);
    
    if (error) throw error;
    
    res.json({ message: 'تم إعادة تعيين الطلب' });
  } catch (error) {
    res.status(500).json({ error: 'فشل في إعادة التعيين' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, basketLimit, linkDurationDays, linkActive } = req.body;
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (basketLimit !== undefined) updateData.basket_limit = basketLimit;
    if (linkDurationDays !== undefined) updateData.link_duration_days = linkDurationDays;
    if (linkActive !== undefined) updateData.link_active = linkActive;
    
    const { data, error } = await supabase
      .from('recipients')
      .update(updateData)
      .eq('id', id)
      .select();
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    res.json(data[0] || data);
  } catch (error) {
    res.status(500).json({ error: 'فشل في التعديل' });
  }
});
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('recipients').delete().eq('id', id);
    if (error) throw error;
    res.json({ message: 'تم الحذف' });
  } catch (error) {
    res.status(500).json({ error: 'فشل في الحذف' });
  }
});

export default router;
