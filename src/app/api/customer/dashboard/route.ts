import { db } from '@/lib/db';
import { ok, handleErrors, unauthorized } from '@/lib/api';
import { requireSession } from '@/lib/auth';
import { toNumber } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handleErrors(async () => {
    const session = await requireSession();
    if (session.role !== 'CUSTOMER' || !session.customerId) return unauthorized('Customer account required');

    const customerId = session.customerId;
    const [orders, quoteRequests, payments, notifications] = await Promise.all([
      db.order.findMany({ where: { customerId }, orderBy: { createdAt: 'desc' }, take: 5, include: { items: true } }),
      db.quoteRequest.findMany({ where: { customerId }, orderBy: { createdAt: 'desc' }, take: 5, include: { service: { select: { name: true } } } }),
      db.payment.findMany({ where: { customerId }, orderBy: { createdAt: 'desc' }, take: 5, include: { order: { select: { orderNumber: true } } } }),
      db.notification.findMany({ where: { userId: session.id }, orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);

    const allOrders = await db.order.findMany({ where: { customerId }, select: { total: true, amountPaid: true, amountDue: true, status: true, paymentStatus: true }});
    const outstanding = allOrders.reduce((s, o) => s + toNumber(o.amountDue), 0);
    const activeOrders = allOrders.filter(o => !['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(o.status)).length;
    const pendingQuotes = await db.quoteRequest.count({ where: { customerId, status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'PRICING'] }}});
    const unreadNotifications = await db.notification.count({ where: { userId: session.id, isRead: false }});

    return ok({
      stats: { outstanding, activeOrders, pendingQuotes, unreadNotifications },
      orders, quoteRequests, payments, notifications,
    });
  });
}
