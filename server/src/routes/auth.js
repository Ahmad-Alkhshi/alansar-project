import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'alansar-secret-key-2024';

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt:', email);

    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email)
      .single();

    console.log('Admin found:', admin);
    console.log('Error:', error);

    if (error || !admin) {
      return res.status(401).json({ error: 'بيانات خاطئة - المستخدم غير موجود' });
    }

    const isValid = await bcrypt.compare(password, admin.password);
    console.log('Password valid:', isValid);
    
    if (!isValid) {
      return res.status(401).json({ error: 'بيانات خاطئة - كلمة المرور خاطئة' });
    }

    const token = jwt.sign({ adminId: admin.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, admin: { id: admin.id, email: admin.email, name: admin.name } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'خطأ في تسجيل الدخول' });
  }
});

export default router;
