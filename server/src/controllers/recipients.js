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
    // Get all recipients
    const { data: recipients, error: recipientsError } = await supabase
      .from('recipients')
      .select('*')
      .order('created_at', { ascending: false });

    if (recipientsError) throw recipientsError;

    // Get all completed orders with basket numbers
    const { data: completedOrders, error: ordersError } = await supabase
      .from('orders')
      .select('recipient_id, warehouse_status, basket_number')
      .eq('warehouse_status', 'completed')
      .not('basket_number', 'is', null);

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      // Continue without orders data
    }

    // Map basket status to recipients
    const recipientsWithBasketStatus = recipients.map(recipient => {
      const completedOrder = completedOrders?.find(
        order => order.recipient_id === recipient.id
      );

      return {
        ...recipient,
        basket_status: completedOrder ? 'completed' : 'pending',
        basket_number: completedOrder?.basket_number || null
      };
    });

    res.json(recipientsWithBasketStatus);
  } catch (error) {
    console.error('Error fetching recipients:', error);
    res.status(500).json({ error: 'فشل في جلب المستفيدين', details: error.message });
  }
};

export const bulkCreateRecipients = async (req, res) => {
  try {
    const { recipients } = req.body;
    
    const recipientsWithTokens = recipients.map(r => ({
      name: r.name,
      phone: r.phone,
      token: crypto.randomBytes(32).toString('hex'),
      basket_limit: r.basketLimit || 500000
    }));

    const { data, error } = await supabase
      .from('recipients')
      .insert(recipientsWithTokens)
      .select();

    if (error) throw error;

    res.json({ message: `تم إضافة ${data.length} مستفيد`, data });
  } catch (error) {
    res.status(500).json({ error: 'فشل في الإضافة الجماعية' });
  }
};
