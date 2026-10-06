import { db } from '@/lib/db';
import { ok, fail, handleErrors, unauthorized, paginate, withMeta, notFound } from '@/lib/api';
import { requireSession } from '@/lib/auth';
import { hashPassword } from '@/lib/auth';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return handleErrors(async () => {
    const session = await requireSession();
    if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(session.role)) return unauthorized();
    const url = new URL(req.url);
    const { page, pageSize, skip, take } = paginate(url.searchParams);
    const role = url.searchParams.get('role');
    const search = url.searchParams.get('search');
    const where: any = {};
    if (role && role !== 'all') where.role = role;
    if (search) where.OR = [{ name: { contains: search } }, { email: { contains: search } }, { phone: { contains: search } }];

    const [users, total] = await Promise.all([
      db.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take,
        select: { id: true, name: true, email: true, phone: true, role: true, status: true, lastLoginAt: true, createdAt: true,
          customer: { select: { customerNumber: true } }, author: { select: { authorNumber: true } } } }),
      db.user.count({ where }),
    ]);
    return ok(withMeta(users, total, page, pageSize));
  });
}

export async function POST(req: Request) {
  return handleErrors(async () => {
    const session = await requireSession();
    if (!['SUPER_ADMIN', 'ADMIN'].includes(session.role)) return unauthorized();
    const body = await req.json();
    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const phone = String(body.phone ?? '').trim();
    const role = String(body.role ?? 'STAFF');
    const password = String(body.password ?? '');

    if (!name || !email || !password) return fail('Name, email and password are required.', 422);
    if (password.length < 8) return fail('Password must be at least 8 characters.', 422);
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return fail('Email already in use.', 409);

    const user = await db.user.create({ data: {
      name, email, phone, role: role as any, status: 'ACTIVE', passwordHash: hashPassword(password), emailVerifiedAt: new Date(),
    }});
    await audit({ actorId: session.id, action: 'staff.created', entityType: 'user', entityId: user.id, newValues: { name, email, role }});
    return ok(user, 'Staff member created.');
  });
}
