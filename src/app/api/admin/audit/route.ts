import { db } from '@/lib/db';
import { ok, handleErrors, unauthorized, paginate, withMeta } from '@/lib/api';
import { requireSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return handleErrors(async () => {
    const session = await requireSession();
    if (!['SUPER_ADMIN', 'ADMIN'].includes(session.role)) return unauthorized();
    const url = new URL(req.url);
    const { page, pageSize, skip, take } = paginate(url.searchParams);
    const action = url.searchParams.get('action');

    const where: any = {};
    if (action) where.action = { contains: action };

    const [items, total] = await Promise.all([
      db.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, include: { actor: { select: { name: true, email: true } } } }),
      db.auditLog.count({ where }),
    ]);
    return ok(withMeta(items, total, page, pageSize));
  });
}
