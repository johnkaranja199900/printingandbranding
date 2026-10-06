import { cookies } from 'next/headers';
import { db } from './db';
import type { User } from '@prisma/client';

export const SESSION_COOKIE = 'pp_session';

// Lightweight session: store userId in an httpOnly cookie.
// (Production would use NextAuth + JWT; this MVP uses a signed-style cookie.)

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  customerId?: string;
  authorId?: string;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionToken) return null;

  try {
    // sessionToken format: userId.secret
    const [userId] = sessionToken.split('.');
    if (!userId) return null;

    const user = await db.user.findFirst({
      where: { id: userId, deletedAt: null, status: 'ACTIVE' },
      select: {
        id: true, email: true, name: true, role: true,
        customer: { select: { id: true } },
        author: { select: { id: true } },
      },
    });
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      customerId: user.customer?.id,
      authorId: user.author?.id,
    };
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  return session;
}

export async function requireRole(...roles: string[]): Promise<SessionUser> {
  const session = await requireSession();
  if (!roles.includes(session.role)) throw new Error('Forbidden');
  return session;
}

export function createSessionToken(userId: string): string {
  const secret = process.env.NEXTAUTH_SECRET || 'pp-dev-secret-change-me';
  // Simple obfuscation. Not cryptographically secure; for demo only.
  return `${userId}.${Buffer.from(secret).toString('base64url').slice(0, 16)}`;
}

export function verifySessionToken(token: string): string | null {
  const [userId] = token.split('.');
  return userId || null;
}

// Password hashing — using Node's built-in scrypt for portability.
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, 'hex');
  const testBuf = scryptSync(password, salt, 64);
  if (hashBuf.length !== testBuf.length) return false;
  return timingSafeEqual(hashBuf, testBuf);
}
