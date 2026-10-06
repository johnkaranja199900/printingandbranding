import { db } from '@/lib/db';
import { ok, handleErrors, unauthorized, paginate, withMeta } from '@/lib/api';
import { requireSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return handleErrors(async () => {
    const session = await requireSession();
    if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES'].includes(session.role)) return unauthorized();
    const url = new URL(req.url);
    const { page, pageSize, skip, take } = paginate(url.searchParams);
    const status = url.searchParams.get('status');
    const where: any = {};
    if (status && status !== 'all') where.status = status;

    const [items, total] = await Promise.all([
      db.contactMessage.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, include: { assignee: { select: { name: true } } } }),
      db.contactMessage.count({ where }),
    ]);
    return ok(withMeta(items, total, page, pageSize));
  });
}

export async function PATCH(req: Request) {
  return handleErrors(async () => {
    const session = await requireSession();
    if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES'].includes(session.role)) return unauthorized();
    const body = await req.json();
    const { id, status, assignedToId } = body;
    const updated = await db.contactMessage.update({ where: { id }, data: { status, assignedToId: assignedToId || null }});
    return ok(updated, 'Message updated.');
  });
}
