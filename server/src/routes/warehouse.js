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
    // جلب الطلبات المتاحة (pending + in_progress) لتطابق صفحة الأدمن
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        recipients (id, name, phone, file_number),
        order_items (
          *,
          products (id, name, price, display_order, unit_weight, unit)
        )
      `)
      .in('warehouse_status', ['pending', 'in_progress'])
      .order('created_at', { ascending: true })
      .limit(300); // حد أقصى 300 طلب لتحسين الأداء

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!orders || orders.length === 0) {
      return res.json([]);
    }

    // ترتيب المواد حسب display_order
    const ordersWithSortedItems = orders.map((order) => {
      const sortedItems = (order.order_items || []).sort((a, b) => {
        const orderA = a.products?.display_order ?? 999;
        const orderB = b.products?.display_order ?? 999;
        return orderA - orderB;
      });

      return {
        ...order,
        order_items: sortedItems
      };
    });

    res.json(ordersWithSortedItems);
  } catch (error) {
    console.error('Error fetching warehouse orders:', error);
    res.status(500).json({ error: error.message || 'فشل في جلب الطلبات' });
  }
});

// Lock order for processing
router.post('/orders/:orderId/lock', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { workerId, isRefresh } = req.body;

    // Check if order exists and its current status
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('warehouse_status, warehouse_locked_by, warehouse_locked_at')
      .eq('id', orderId)
      .single();

    if (!existingOrder) {
      return res.status(404).json({ error: 'الطلب غير موجود' });
    }

    // If order is already locked by this worker (refresh case)
    if (existingOrder.warehouse_locked_by === workerId) {
      console.log(`Order ${orderId} already locked by worker ${workerId} - refresh case`);
      
      // If this is a refresh, reset the items to pending
      if (isRefresh) {
        console.log(`Resetting items for order ${orderId} due to refresh`);
        const { error: itemsError } = await supabase
          .from('order_items')
          .update({
            warehouse_status: 'pending',
            warehouse_notes: null
          })
          .eq('order_id', orderId);

        if (itemsError) {
          console.error('Error resetting order items on refresh:', itemsError);
        }
      }
      
      const { data } = await supabase
        .from('orders')
        .select()
        .eq('id', orderId)
        .single();
      return res.json(data);
    }

    // Check if order is not pending anymore
    if (existingOrder.warehouse_status !== 'pending') {
      return res.status(409).json({ 
        error: 'هذا الطلب تم تجهيزه أو قيد التجهيز من قبل عامل آخر'
      });
    }

    // Check if order is already locked by another worker
    if (existingOrder.warehouse_locked_by && existingOrder.warehouse_locked_by !== workerId) {
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
      .eq('warehouse_status', 'pending') // Double check it's still pending
      .select()
      .single();

    if (error) throw error;
    
    if (!data) {
      return res.status(409).json({ 
        error: 'هذا الطلب تم قفله من قبل عامل آخر للتو'
      });
    }

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

// Complete order preparation - Reserve basket number immediately
router.post('/orders/:orderId/complete', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { notes } = req.body;

    // Always recalculate basket number to find the smallest available number
    // Get all basket numbers currently in use
    const { data: ordersWithBaskets } = await supabase
      .from('orders')
      .select('basket_number')
      .not('basket_number', 'is', null)
      .neq('id', orderId) // Exclude current order
      .order('basket_number', { ascending: true });

    const usedNumbers = ordersWithBaskets?.map(o => o.basket_number) || [];
    
    // Find the smallest available number
    let basketNumber = 1;
    for (const num of usedNumbers) {
      if (num === basketNumber) {
        basketNumber++;
      } else if (num > basketNumber) {
        break; // Found a gap
      }
    }
    
    console.log(`Calculating basket number for order ${orderId}: used=${usedNumbers.join(',')}, assigned=${basketNumber}`);

    // Check if any items have issues
    const { data: items } = await supabase
      .from('order_items')
      .select('warehouse_status')
      .eq('order_id', orderId);

    const hasIssues = items?.some(item => item.warehouse_status === 'issue');
    const finalStatus = hasIssues ? 'has_issues' : 'preparing_complete';

    // Update status AND reserve the basket number
    const { data, error } = await supabase
      .from('orders')
      .update({
        warehouse_status: finalStatus,
        warehouse_notes: notes || null,
        basket_number: basketNumber,
        basket_number_reserved: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    
    console.log(`Order ${orderId} reserved basket number: ${basketNumber}`);
    res.json({ ...data, basketNumber: basketNumber });
  } catch (error) {
    console.error('Error completing order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Confirm basket number (finalize order)
router.post('/orders/:orderId/confirm', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { workerId, workerName } = req.body;

    // التحقق من وجود basket_number قبل التأكيد
    const { data: orderCheck } = await supabase
      .from('orders')
      .select('basket_number, warehouse_status')
      .eq('id', orderId)
      .single();

    if (!orderCheck || !orderCheck.basket_number) {
      return res.status(400).json({ 
        error: 'لا يمكن تأكيد الطلب بدون رقم سلة. يرجى المحاولة مرة أخرى.' 
      });
    }

    // الحالة النهائية تعتمد على الحالة الحالية
    // إذا كانت has_issues تبقى has_issues، وإلا تصير completed
    const finalStatus = orderCheck.warehouse_status === 'has_issues' ? 'has_issues' : 'completed';

    // Update status and add worker info
    const { data, error } = await supabase
      .from('orders')
      .update({
        warehouse_status: finalStatus,
        warehouse_locked_by: null,
        warehouse_locked_at: null,
        worker_id: workerId || null,
        worker_name: workerName || null
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    
    console.log(`Order ${orderId} confirmed with basket number: ${orderCheck.basket_number}, status: ${finalStatus}`);
    res.json(data);
  } catch (error) {
    console.error('Error confirming basket:', error);
    res.status(500).json({ error: error.message });
  }
});

// Go back to editing (clear basket number but keep order locked)
router.post('/orders/:orderId/cancel-basket', async (req, res) => {
  try {
    const { orderId } = req.params;

    // Change status back to in_progress and CLEAR basket number
    const { data, error } = await supabase
      .from('orders')
      .update({
        warehouse_status: 'in_progress',
        warehouse_notes: null,
        basket_number: null,
        basket_number_reserved: null
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    // Reset all order items to pending (clear worker selections)
    const { error: itemsError } = await supabase
      .from('order_items')
      .update({
        warehouse_status: 'pending',
        warehouse_notes: null
      })
      .eq('order_id', orderId);

    if (itemsError) {
      console.error('Error resetting order items:', itemsError);
    }

    console.log(`Order ${orderId} went back to editing, basket number and items cleared`);
    res.json(data);
  } catch (error) {
    console.error('Error going back:', error);
    res.status(500).json({ error: error.message });
  }
});

// Unlock order (cancel processing)
router.post('/orders/:orderId/unlock', async (req, res) => {
  try {
    const { orderId } = req.params;

    // Reset order status and clear basket number
    const { data, error } = await supabase
      .from('orders')
      .update({
        warehouse_status: 'pending',
        warehouse_locked_by: null,
        warehouse_locked_at: null,
        basket_number: null,
        basket_number_reserved: null,
        warehouse_notes: null
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    // Reset all order items to pending (clear worker selections)
    const { error: itemsError } = await supabase
      .from('order_items')
      .update({
        warehouse_status: 'pending',
        warehouse_notes: null
      })
      .eq('order_id', orderId);

    if (itemsError) {
      console.error('Error resetting order items:', itemsError);
    }

    console.log(`Order ${orderId} unlocked and reset completely`);
    res.json(data);
  } catch (error) {
    console.error('Error unlocking order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk reset all orders (Admin only)
router.post('/orders/reset-all', async (req, res) => {
  try {
    // Reset all orders in one query
    const { error: ordersError } = await supabase
      .from('orders')
      .update({
        warehouse_status: 'pending',
        warehouse_notes: null,
        warehouse_locked_by: null,
        warehouse_locked_at: null,
        basket_number: null,
        basket_number_reserved: null
      })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

    if (ordersError) throw ordersError;

    // Reset all order items in one query
    const { error: itemsError } = await supabase
      .from('order_items')
      .update({
        warehouse_status: 'pending',
        warehouse_notes: null
      })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

    if (itemsError) throw itemsError;

    // Get count of reset orders
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    res.json({ message: 'تم إعادة تعيين جميع الطلبات بنجاح', count: count || 0 });
  } catch (error) {
    console.error('Error resetting all orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reset order for re-preparation (Admin only)
router.post('/orders/:orderId/reset', async (req, res) => {
  try {
    const { orderId } = req.params;

    // إعادة تعيين حالة الطلب
    const { error: orderError } = await supabase
      .from('orders')
      .update({
        warehouse_status: 'pending',
        warehouse_notes: null,
        warehouse_locked_by: null,
        warehouse_locked_at: null
      })
      .eq('id', orderId);

    if (orderError) throw orderError;

    // إعادة تعيين حالة المواد
    const { error: itemsError } = await supabase
      .from('order_items')
      .update({
        warehouse_status: 'pending',
        warehouse_notes: null
      })
      .eq('order_id', orderId);

    if (itemsError) throw itemsError;

    res.json({ message: 'تم إعادة تعيين الطلب بنجاح' });
  } catch (error) {
    console.error('Error resetting order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Resolve issue (Admin only)
router.post('/orders/:orderId/resolve', async (req, res) => {
  try {
    const { orderId } = req.params;

    const { data, error } = await supabase
      .from('orders')
      .update({
        warehouse_status: 'completed'
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error resolving order:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
