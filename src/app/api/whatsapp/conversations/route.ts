// List recent WhatsApp conversations for the admin console.

import { db } from '@/lib/db';
import { ok, handleErrors, unauthorized, paginate } from '@/lib/api';
import { requireSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return handleErrors(async () => {
    const session = await requireSession();
    if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES', 'STAFF'].includes(session.role)) return unauthorized();
    const url = new URL(req.url);
    const { skip, take } = paginate(url.searchParams);

    const [items, total] = await Promise.all([
      db.whatsappMessage.findMany({ orderBy: { createdAt: 'desc' }, skip, take }),
      db.whatsappMessage.count(),
    ]);
    return ok({ items, total });
  });
}
