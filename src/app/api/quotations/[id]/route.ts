import { db } from '@/lib/db';
import { ok, fail, handleErrors, notFound, unauthorized } from '@/lib/api';
import { getSession, requireSession } from '@/lib/auth';
import { generateReference, generateTrackingToken, round2, toNumber } from '@/lib/types';
import { audit, notify } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleErrors(async () => {
    const session = await requireSession();
    const { id } = await params;
    const q = await db.quotation.findUnique({
      where: { id },
      include: { items: { include: { service: true } }, customer: true, quoteRequest: { include: { service: true, values: { include: { serviceField: true } } } } },
    });
    if (!q) return notFound('Quotation not found');
    if (session.role === 'CUSTOMER' && q.customerId !== session.customerId) return unauthorized();
    return ok(q);
  });
}

// Customer accepts/rejects quotation; admin can update status/fields
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleErrors(async () => {
    const session = await requireSession();
    const { id } = await params;
    const body = await req.json();
    const action = String(body.action ?? '');

    const quotation = await db.quotation.findUnique({ where: { id }, include: { items: true, customer: { include: { user: true } } } });
    if (!quotation) return notFound('Quotation not found');

    // Customer accept/reject
    if (action === 'accept' || action === 'reject') {
      if (session.role !== 'CUSTOMER' || quotation.customerId !== session.customerId) return unauthorized();
      if (quotation.status === 'CUSTOMER_ACCEPTED') return fail('This quotation has already been accepted.', 422);
      if (quotation.status === 'CUSTOMER_REJECTED') return fail('This quotation has already been rejected.', 422);
      if (quotation.status === 'EXPIRED' || quotation.status === 'CANCELLED') return fail('This quotation is no longer active.', 422);
      if (new Date(quotation.validUntil) < new Date()) return fail('This quotation has expired. Please request a new one.', 422);

      if (action === 'accept') {
        // Create order in a transaction
        const orderCount = await db.order.count();
        const orderNumber = generateReference('ORD', orderCount + 1);
        const depositPercent = 50;
        const total = toNumber(quotation.total);
        const deposit = round2(total * depositPercent / 100);

        const order = await db.$transaction(async (tx) => {
          const order = await tx.order.create({ data: {
            orderNumber, customerId: quotation.customerId, quotationId: quotation.id,
            status: 'AWAITING_PAYMENT', paymentStatus: 'UNPAID', productionStatus: 'not_started',
            currency: quotation.currency, subtotal: quotation.subtotal, discount: quotation.discount,
            tax: quotation.tax, total: quotation.total, amountPaid: 0, amountDue: quotation.total,
            depositRequired: deposit, depositAmount: deposit,
            expectedCompletionDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            trackingToken: generateTrackingToken(), notes: quotation.notes,
          }});
          await tx.orderItem.createMany({ data: quotation.items.map(it => ({
            orderId: order.id, serviceId: it.serviceId, description: it.description,
            quantity: it.quantity, unitPrice: it.unitPrice, discount: it.discount,
            taxRate: it.taxRate, lineTotal: it.lineTotal, status: 'pending',
          }))});
          await tx.orderStatusHistory.create({ data: {
            orderId: order.id, toStatus: 'AWAITING_PAYMENT', changedById: session.id, reason: 'Quotation accepted by customer',
          }});
          await tx.quotation.update({ where: { id: quotation.id }, data: { status: 'CUSTOMER_ACCEPTED', approvedAt: new Date() }});
          return order;
        });

        await audit({ actorId: session.id, action: 'quotation.accepted', entityType: 'quotation', entityId: quotation.id, newValues: { orderNumber }});

        // Notify admins
        const admins = await db.user.findMany({ where: { role: { in: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES'] }, status: 'ACTIVE' }});
        await Promise.all(admins.map(a => notify({ userId: a.id, title: 'Quotation accepted', message: `${quotation.quoteNumber} accepted — order ${orderNumber} created.`, type: 'success', link: 'admin-orders' })));

        return ok({ order }, 'Quotation accepted! Your order has been created. Please proceed with the deposit payment.');
      } else {
        await db.quotation.update({ where: { id: quotation.id }, data: { status: 'CUSTOMER_REJECTED' }});
        await audit({ actorId: session.id, action: 'quotation.rejected', entityType: 'quotation', entityId: quotation.id });
        return ok(null, 'Quotation declined. Thank you for your feedback.');
      }
    }

    // Admin updates quotation (status, notes, terms)
    if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES'].includes(session.role)) return unauthorized();
    const data: any = {};
    if (body.status) data.status = body.status;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.terms !== undefined) data.terms = body.terms;
    if (body.validUntil) data.validUntil = new Date(body.validUntil);
    const updated = await db.quotation.update({ where: { id }, data });
    await audit({ actorId: session.id, action: 'quotation.updated', entityType: 'quotation', entityId: id, newValues: data });
    return ok(updated, 'Quotation updated.');
  });
}
