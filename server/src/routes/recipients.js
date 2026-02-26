import express from 'express';
import { createRecipient, getAllRecipients } from '../controllers/recipients.js';
import { supabase } from '../config/supabase.js';

const router = express.Router();

router.post('/', createRecipient);
router.get('/', getAllRecipients);
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, basketLimit } = req.body;
    console.log('PUT request received:', { id, name, phone, basketLimit });
    
    const updateData = { name, phone };
    if (basketLimit !== undefined) {
      updateData.basket_limit = basketLimit;
    }
    
    console.log('Update data:', updateData);
    
    const { data, error } = await supabase
      .from('recipients')
      .update(updateData)
      .eq('id', id)
      .select();
    
    console.log('Supabase response:', { data, error });
    
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }
    
    res.json(data[0] || data);
  } catch (error) {
    console.error('Update failed:', error);
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
