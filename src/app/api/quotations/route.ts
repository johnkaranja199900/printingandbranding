import { db } from '@/lib/db';
import { ok, fail, handleErrors, paginate, withMeta, unauthorized } from '@/lib/api';
import { getSession, requireSession } from '@/lib/auth';
import { generateReference, toNumber, round2 } from '@/lib/types';
import { audit, notify } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return handleErrors(async () => {
    const session = await requireSession();
    const url = new URL(req.url);
    const { page, pageSize, skip, take } = paginate(url.searchParams);
    const status = url.searchParams.get('status');

    const where: any = {};
    if (session.role === 'CUSTOMER' && session.customerId) where.customerId = session.customerId;
    else if (session.role === 'AUTHOR') where.customerId = { in: [] };
    else if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES', 'DESIGNER', 'PRODUCTION', 'PUBLISHER', 'FINANCE', 'STAFF'].includes(session.role)) return unauthorized();
    if (status && status !== 'all') where.status = status;

    const [items, total] = await Promise.all([
      db.quotation.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, include: {
        customer: { select: { id: true, firstName: true, lastName: true, businessName: true, customerNumber: true } },
        items: true, quoteRequest: { select: { requestNumber: true, subject: true } },
      }}),
      db.quotation.count({ where }),
    ]);
    return ok(withMeta(items, total, page, pageSize));
  });
}

// Admin creates a quotation from a quote request
export async function POST(req: Request) {
  return handleErrors(async () => {
    const session = await requireSession();
    if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES'].includes(session.role)) return unauthorized();
    const body = await req.json();

    const customerId = String(body.customerId ?? '');
    const quoteRequestId = body.quoteRequestId ? String(body.quoteRequestId) : null;
    const notes = String(body.notes ?? '').trim() || null;
    const terms = String(body.terms ?? '').trim() || null;
    const validUntil = body.validUntil ? new Date(body.validUntil) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const taxRate = body.taxRate ? Number(body.taxRate) : 0;
    const items: Array<{ serviceId?: string; description: string; quantity: number; unitPrice: number; discount?: number; taxRate?: number }> = body.items ?? [];

    if (!customerId) return fail('Customer is required.', 422);
    if (!items.length) return fail('At least one quotation item is required.', 422);

    // Server-side totals calculation (never trust client)
    let subtotal = 0;
    let totalDiscount = 0;
    const computedItems = items.map((it, i) => {
      const qty = Number(it.quantity) || 1;
      const price = Number(it.unitPrice) || 0;
      const disc = Number(it.discount ?? 0) || 0;
      const itemTaxRate = Number(it.taxRate ?? taxRate) || 0;
      const lineSubtotal = qty * price;
      const lineTotal = round2(lineSubtotal - disc);
      subtotal += lineSubtotal;
      totalDiscount += disc;
      return { serviceId: it.serviceId || null, description: it.description, quantity: qty, unitPrice: price, discount: disc, taxRate: itemTaxRate, lineTotal, sortOrder: i + 1 };
    });
    const tax = round2((subtotal - totalDiscount) * taxRate / 100);
    const total = round2(subtotal - totalDiscount + tax);

    const count = await db.quotation.count();
    const quoteNumber = generateReference('QTR', count + 1);

    const quotation = await db.quotation.create({ data: {
      quoteNumber, quoteRequestId, customerId, status: 'SENT',
      currency: 'KES', subtotal, discount: totalDiscount, taxRate, tax, total,
      validUntil, notes, terms, createdById: session.id, sentAt: new Date(),
    }, include: { items: true }});

    await db.quotationItem.createMany({ data: computedItems.map(it => ({ quotationId: quotation.id, ...it }))});

    // Update quote request status
    if (quoteRequestId) {
      await db.quoteRequest.update({ where: { id: quoteRequestId }, data: { status: 'QUOTED' }});
    }

    await audit({ actorId: session.id, action: 'quotation.created', entityType: 'quotation', entityId: quotation.id, newValues: { quoteNumber, total }});

    // Notify customer
    const customer = await db.customer.findUnique({ where: { id: customerId }, include: { user: true }});
    if (customer?.user) {
      await notify({ userId: customer.user.id, title: 'New quotation ready', message: `Quotation ${quoteNumber} for KES ${total.toLocaleString()} is ready for your review.`, type: 'info', link: 'customer-quotations' });
    }

    const full = await db.quotation.findUnique({ where: { id: quotation.id }, include: { items: true, customer: true }});
    return ok(full, 'Quotation created and sent to customer.');
  });
}
