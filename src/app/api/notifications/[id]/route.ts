import { db } from '@/lib/db';
import { ok, handleErrors, notFound } from '@/lib/api';
import { requireSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Mark notification as read
export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleErrors(async () => {
    const session = await requireSession();
    const { id } = await params;
    const n = await db.notification.findUnique({ where: { id } });
    if (!n) return notFound('Notification not found');
    if (n.userId !== session.id) return notFound('Notification not found');
    const updated = await db.notification.update({ where: { id }, data: { isRead: true }});
    return ok(updated);
  });
}
