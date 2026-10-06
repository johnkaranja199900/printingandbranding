import { db } from '@/lib/db';
import { ok, handleErrors, notFound, unauthorized } from '@/lib/api';
import { getSession, requireSession } from '@/lib/auth';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleErrors(async () => {
    const session = await requireSession();
    const { id } = await params;
    const qr = await db.quoteRequest.findUnique({
      where: { id },
      include: {
        customer: true, service: { include: { category: true } },
        values: { include: { serviceField: true } },
        quotations: { include: { items: true } },
      },
    });
    if (!qr) return notFound('Quote request not found');
    if (session.role === 'CUSTOMER' && qr.customerId !== session.customerId) return unauthorized();
    return ok(qr);
  });
}

// Update status (admin) — e.g. move to under_review, pricing, rejected
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleErrors(async () => {
    const session = await requireSession();
    if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES'].includes(session.role)) return unauthorized();
    const { id } = await params;
    const body = await req.json();
    const qr = await db.quoteRequest.findUnique({ where: { id } });
    if (!qr) return notFound('Quote request not found');

    const data: any = {};
    if (body.status) data.status = body.status;
    if (body.priority) data.priority = body.priority;
    if (body.assignedToId !== undefined) data.assignedToId = body.assignedToId || null;

    const updated = await db.quoteRequest.update({ where: { id }, data });
    await audit({ actorId: session.id, action: 'quote_request.updated', entityType: 'quote_request', entityId: id, newValues: data });
    return ok(updated, 'Quote request updated.');
  });
}
