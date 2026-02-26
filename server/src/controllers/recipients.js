import { supabase } from '../config/supabase.js';
import crypto from 'crypto';

export const createRecipient = async (req, res) => {
  try {
    const { name, phone, basketLimit } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'الاسم ورقم الملف مطلوبان' });
    }

    const token = crypto.randomBytes(32).toString('hex');

    const { data, error } = await supabase
      .from('recipients')
      .insert([{ name, phone, token, basket_limit: basketLimit || 500000 }])
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'فشل في إضافة المستفيد' });
  }
};

export const getAllRecipients = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('recipients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'فشل في جلب المستفيدين' });
  }
};
