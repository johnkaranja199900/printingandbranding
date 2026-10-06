import { db } from '@/lib/db';
import { verifyPassword, createSessionToken, SESSION_COOKIE } from '@/lib/auth';
import { ok, fail, handleErrors } from '@/lib/api';
import { audit } from '@/lib/audit';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return handleErrors(async () => {
    const body = await req.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    if (!email || !password) return fail('Email and password are required.', 422);

    const user = await db.user.findFirst({
      where: { email, deletedAt: null },
      include: { customer: { select: { id: true, customerNumber: true } }, author: { select: { id: true, authorNumber: true } } },
    });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return fail('Invalid email or password.', 401);
    }
    if (user.status !== 'ACTIVE') {
      return fail('Your account is ' + user.status.toLowerCase() + '. Please contact support.', 403);
    }

    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), lastLoginIp: req.headers.get('x-forwarded-for') ?? null }});
    await audit({ actorId: user.id, action: 'auth.login', entityType: 'user', entityId: user.id, ipAddress: req.headers.get('x-forwarded-for') ?? undefined, userAgent: req.headers.get('user-agent') ?? undefined });

    const token = createSessionToken(user.id);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return ok({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      customerId: user.customer?.id ?? null,
      customerNumber: user.customer?.customerNumber ?? null,
      authorId: user.author?.id ?? null,
    }, 'Welcome back, ' + user.name.split(' ')[0] + '!');
  });
}
