import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Get all orders ready for warehouse
router.get('/orders', async (req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        recipients (id, name, phone),
        order_items (
          *,
          products (id, name, price)
        )
      `)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(orders);
  } catch (error) {
    console.error('Error fetching warehouse orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Lock order for processing
router.post('/orders/:orderId/lock', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { workerId } = req.body;

    // Check if order is already locked
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('warehouse_locked_by, warehouse_locked_at')
      .eq('id', orderId)
      .single();

    if (existingOrder?.warehouse_locked_by) {
      // Check if lock is older than 30 minutes (expired)
      const lockedAt = new Date(existingOrder.warehouse_locked_at);
      const now = new Date();
      const diffMinutes = (now - lockedAt) / 1000 / 60;

      if (diffMinutes < 30) {
        return res.status(409).json({ 
          error: 'هذا الطلب قيد التجهيز من قبل عامل آخر',
          lockedBy: existingOrder.warehouse_locked_by 
        });
      }
    }

    // Lock the order
    const { data, error } = await supabase
      .from('orders')
      .update({
        warehouse_status: 'in_progress',
        warehouse_locked_by: workerId,
        warehouse_locked_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error locking order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update item status
router.post('/items/:itemId/status', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { status, notes } = req.body;

    const { data, error } = await supabase
      .from('order_items')
      .update({
        warehouse_status: status,
        warehouse_notes: notes || null
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error updating item status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Complete order preparation
router.post('/orders/:orderId/complete', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { notes } = req.body;

    // Check if any items have issues
    const { data: items } = await supabase
      .from('order_items')
      .select('warehouse_status')
      .eq('order_id', orderId);

    const hasIssues = items?.some(item => item.warehouse_status === 'issue');
    const finalStatus = hasIssues ? 'has_issues' : 'completed';

    const { data, error } = await supabase
      .from('orders')
      .update({
        warehouse_status: finalStatus,
        warehouse_notes: notes || null,
        warehouse_locked_by: null,
        warehouse_locked_at: null
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error completing order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Unlock order (cancel processing)
router.post('/orders/:orderId/unlock', async (req, res) => {
  try {
    const { orderId } = req.params;

    const { data, error } = await supabase
      .from('orders')
      .update({
        warehouse_status: 'pending',
        warehouse_locked_by: null,
        warehouse_locked_at: null
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error unlocking order:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
