import { db } from '@/lib/db';
import { ok, fail, handleErrors, notFound, unauthorized, paginate, withMeta } from '@/lib/api';
import { getSession, requireSession } from '@/lib/auth';
import { generateReference, round2, toNumber } from '@/lib/types';
import { audit, notify } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return handleErrors(async () => {
    const session = await requireSession();
    const url = new URL(req.url);
    const { page, pageSize, skip, take } = paginate(url.searchParams);
    const orderId = url.searchParams.get('orderId');

    const where: any = {};
    if (session.role === 'CUSTOMER' && session.customerId) where.customerId = session.customerId;
    else if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE', 'SALES'].includes(session.role)) return unauthorized();
    if (orderId) where.orderId = orderId;

    const [items, total] = await Promise.all([
      db.payment.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, include: {
        order: { select: { orderNumber: true } }, customer: { select: { firstName: true, lastName: true, businessName: true, customerNumber: true } },
      }}),
      db.payment.count({ where }),
    ]);
    return ok(withMeta(items, total, page, pageSize));
  });
}

// Record a payment (customer via M-Pesa STK simulation, or admin recording cash/bank)
export async function POST(req: Request) {
  return handleErrors(async () => {
    const session = await requireSession();
    const body = await req.json();
    const orderId = String(body.orderId ?? '');
    const method = String(body.method ?? 'MPESA');
    const amount = Number(body.amount ?? 0);
    const notes = String(body.notes ?? '').trim() || null;
    const transactionReference = body.transactionReference ? String(body.transactionReference) : null;
    const customerInitiated = session.role === 'CUSTOMER';

    if (!orderId || !amount || amount <= 0) return fail('Order and a valid amount are required.', 422);
    if (!['CASH', 'MPESA', 'BANK', 'CARD', 'OTHER'].includes(method)) return fail('Invalid payment method.', 422);

    const order = await db.order.findUnique({ where: { id: orderId }, include: { customer: { include: { user: true } } } });
    if (!order) return notFound('Order not found');

    if (customerInitiated) {
      if (order.customerId !== session.customerId) return unauthorized();
      if (order.status === 'CANCELLED' || order.status === 'REFUNDED') return fail('This order cannot receive payments.', 422);
    } else if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'].includes(session.role)) return unauthorized();

    if (round2(amount) > round2(toNumber(order.amountDue) + 1)) {
      return fail('Amount exceeds the outstanding balance.', 422);
    }

    const customerId = order.customerId;
    const count = await db.payment.count();
    const paymentReference = generateReference('PAY', count + 1);

    // Simulate M-Pesa STK — auto-succeed for demo (in production this is async via Daraja callback)
    const isMpesa = method === 'MPESA';
    const payment = await db.payment.create({ data: {
      paymentReference, orderId, customerId, method, amount,
      currency: order.currency, status: 'SUCCESSFUL',
      transactionReference: transactionReference ?? (isMpesa ? `MPESA-${Date.now().toString(36).toUpperCase()}` : `${method}-${Date.now().toString(36).toUpperCase()}`),
      providerReference: isMpesa ? `SAF-${paymentReference}` : null,
      recordedById: session.id, paidAt: new Date(), notes,
    }});

    // Update order amountPaid/amountDue atomically
    await db.$transaction(async (tx) => {
      const fresh = await tx.order.findUnique({ where: { id: orderId }});
      if (!fresh) return;
      const newPaid = round2(toNumber(fresh.amountPaid) + amount);
      const newDue = round2(toNumber(fresh.total) - newPaid);
      const paymentStatus = newDue <= 0 ? 'PAID' : (newPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID');
      const status = fresh.status === 'AWAITING_PAYMENT' && newPaid >= toNumber(fresh.depositRequired) ? 'CONFIRMED' : fresh.status;
      await tx.order.update({ where: { id: orderId }, data: {
        amountPaid: newPaid, amountDue: Math.max(0, newDue), paymentStatus, status,
      }});
    });

    await audit({ actorId: session.id, action: 'payment.recorded', entityType: 'payment', entityId: payment.id, newValues: { paymentReference, amount, method, orderId: order.orderNumber }});

    // Notify
    if (order.customer?.user) {
      await notify({ userId: order.customer.user.id, title: 'Payment received', message: `We've received your ${method} payment of KES ${amount.toLocaleString()} for ${order.orderNumber}.`, type: 'success', link: 'customer-orders' });
    }
    const admins = await db.user.findMany({ where: { role: { in: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'] }, status: 'ACTIVE' }});
    await Promise.all(admins.map(a => notify({ userId: a.id, title: 'Payment received', message: `${method} payment of KES ${amount.toLocaleString()} for ${order.orderNumber}.`, type: 'success', link: 'admin-sales' })));

    return ok(payment, 'Payment recorded successfully.');
  });
}
