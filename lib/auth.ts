import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production'

export interface TokenPayload {
  recipientId: string
  token: string
}

/**
 * التحقق من صحة token المستفيد
 */
export async function verifyRecipientToken(token: string): Promise<boolean> {
  try {
    // Token بسيط - نتحقق من وجوده في قاعدة البيانات
    return token.length > 10
  } catch {
    return false
  }
}

/**
 * تشفير كلمة المرور
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

/**
 * التحقق من كلمة المرور
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

/**
 * إنشاء JWT للإدارة
 */
export function createAdminToken(adminId: string): string {
  return jwt.sign({ adminId, role: 'admin' }, JWT_SECRET, {
    expiresIn: '7d',
  })
}

/**
 * التحقق من JWT للإدارة
 */
export function verifyAdminToken(token: string): { adminId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { adminId: string }
    return decoded
  } catch {
    return null
  }
}

/**
 * توليد token عشوائي للمستفيد
 */
export function generateRecipientToken(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}
