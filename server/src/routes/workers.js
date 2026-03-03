import express from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Get all workers
router.get('/', async (req, res) => {
  try {
    const { data: workers, error } = await supabase
      .from('workers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(workers || []);
  } catch (error) {
    console.error('Error fetching workers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get worker by token (with device verification)
router.post('/token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: 'معرّف الجهاز مطلوب' });
    }

    const { data: worker, error } = await supabase
      .from('workers')
      .select('*')
      .eq('token', token)
      .single();

    if (error) throw error;
    
    if (!worker) {
      return res.status(404).json({ error: 'العامل غير موجود' });
    }

    if (!worker.is_active) {
      return res.status(403).json({ error: 'هذا الحساب غير نشط' });
    }

    // Check device restriction
    if (worker.device_id && worker.device_id !== deviceId) {
      return res.status(403).json({ 
        error: 'DEVICE_MISMATCH',
        message: 'هذا الرابط مفتوح على جهاز آخر' 
      });
    }

    // If no device_id set, or same device, update/set device_id
    if (!worker.device_id || worker.device_id === deviceId) {
      await supabase
        .from('workers')
        .update({ device_id: deviceId })
        .eq('id', worker.id);
    }

    res.json(worker);
  } catch (error) {
    console.error('Error fetching worker:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get worker by token (legacy GET endpoint - kept for compatibility)
router.get('/token/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const { data: worker, error } = await supabase
      .from('workers')
      .select('*')
      .eq('token', token)
      .single();

    if (error) throw error;
    
    if (!worker) {
      return res.status(404).json({ error: 'العامل غير موجود' });
    }

    if (!worker.is_active) {
      return res.status(403).json({ error: 'هذا الحساب غير نشط' });
    }

    res.json(worker);
  } catch (error) {
    console.error('Error fetching worker:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get worker stats (completed baskets count)
router.get('/:workerId/stats', async (req, res) => {
  try {
    const { workerId } = req.params;

    const { count, error } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('worker_id', workerId)
      .eq('warehouse_status', 'completed');

    if (error) throw error;

    res.json({ completedBaskets: count || 0 });
  } catch (error) {
    console.error('Error fetching worker stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new worker
router.post('/', async (req, res) => {
  try {
    const { name, phone, notes } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'الاسم ورقم الهاتف مطلوبان' });
    }

    // Generate unique token
    const token = crypto.randomBytes(16).toString('hex');

    const { data: worker, error } = await supabase
      .from('workers')
      .insert({
        name,
        phone,
        token,
        notes: notes || null,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({ error: 'رقم الهاتف مستخدم مسبقاً' });
      }
      throw error;
    }

    res.json(worker);
  } catch (error) {
    console.error('Error creating worker:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update worker
router.put('/:workerId', async (req, res) => {
  try {
    const { workerId } = req.params;
    const { name, phone, notes, isActive, deviceId } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (notes !== undefined) updates.notes = notes;
    if (isActive !== undefined) updates.is_active = isActive;
    if (deviceId !== undefined) updates.device_id = deviceId; // Allow null to reset
    updates.updated_at = new Date().toISOString();

    const { data: worker, error } = await supabase
      .from('workers')
      .update(updates)
      .eq('id', workerId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'رقم الهاتف مستخدم مسبقاً' });
      }
      throw error;
    }

    res.json(worker);
  } catch (error) {
    console.error('Error updating worker:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete worker
router.delete('/:workerId', async (req, res) => {
  try {
    const { workerId } = req.params;

    const { error } = await supabase
      .from('workers')
      .delete()
      .eq('id', workerId);

    if (error) throw error;

    res.json({ message: 'تم حذف العامل بنجاح' });
  } catch (error) {
    console.error('Error deleting worker:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
