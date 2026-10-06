import { db } from '@/lib/db';
import { ok, fail, handleErrors, notFound, unauthorized, paginate, withMeta } from '@/lib/api';
import { getSession, requireSession } from '@/lib/auth';
import { audit, notify } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return handleErrors(async () => {
    const session = await requireSession();
    const url = new URL(req.url);
    const { page, pageSize, skip, take } = paginate(url.searchParams);
    const status = url.searchParams.get('status');
    const paymentStatus = url.searchParams.get('paymentStatus');
    const search = url.searchParams.get('search');

    const where: any = {};
    if (session.role === 'CUSTOMER' && session.customerId) where.customerId = session.customerId;
    else if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES', 'DESIGNER', 'PRODUCTION', 'PUBLISHER', 'FINANCE', 'INVENTORY_MANAGER', 'STAFF'].includes(session.role)) return unauthorized();
    if (status && status !== 'all') where.status = status;
    if (paymentStatus && paymentStatus !== 'all') where.paymentStatus = paymentStatus;
    if (search) where.orderNumber = { contains: search };

    const [items, total] = await Promise.all([
      db.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, include: {
        customer: { select: { id: true, firstName: true, lastName: true, businessName: true, customerNumber: true, phone: true } },
        items: true, payments: { select: { id: true, amount: true, method: true, status: true, paidAt: true, paymentReference: true } },
      }}),
      db.order.count({ where }),
    ]);
    return ok(withMeta(items, total, page, pageSize));
  });
}
