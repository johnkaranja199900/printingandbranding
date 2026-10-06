import { db } from '@/lib/db';
import { ok, handleErrors, notFound } from '@/lib/api';
import { getSession, requireSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return handleErrors(async () => {
    const session = await requireSession();
    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get('unread') === 'true';

    const where: any = { userId: session.id };
    if (unreadOnly) where.isRead = false;

    const items = await db.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 });
    const unreadCount = await db.notification.count({ where: { userId: session.id, isRead: false }});
    return ok({ items, unreadCount });
  });
}
