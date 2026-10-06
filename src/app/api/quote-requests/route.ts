import { db } from '@/lib/db';
import { ok, fail, handleErrors, paginate, withMeta, unauthorized } from '@/lib/api';
import { getSession, requireSession } from '@/lib/auth';
import { generateReference } from '@/lib/types';
import { audit, notify } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// List quote requests (admin sees all, customer sees own)
export async function GET(req: Request) {
  return handleErrors(async () => {
    const session = await requireSession();
    const url = new URL(req.url);
    const { page, pageSize, skip, take } = paginate(url.searchParams);
    const status = url.searchParams.get('status');

    const where: any = {};
    if (session.role === 'CUSTOMER' && session.customerId) {
      where.customerId = session.customerId;
    } else if (session.role === 'AUTHOR') {
      // Authors don't have quote requests directly
      where.customerId = { in: [] };
    } else if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES', 'DESIGNER', 'PRODUCTION', 'PUBLISHER', 'FINANCE', 'STAFF'].includes(session.role)) {
      return unauthorized();
    }
    if (status && status !== 'all') where.status = status;

    const [items, total] = await Promise.all([
      db.quoteRequest.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, include: {
        customer: { select: { id: true, firstName: true, lastName: true, businessName: true, customerNumber: true } },
        service: { select: { id: true, name: true, slug: true } },
      }}),
      db.quoteRequest.count({ where }),
    ]);
    return ok(withMeta(items, total, page, pageSize));
  });
}

// Create a quote request (customer)
export async function POST(req: Request) {
  return handleErrors(async () => {
    const session = await requireSession();
    const body = await req.json();

    const serviceId = body.serviceId ? String(body.serviceId) : null;
    const subject = String(body.subject ?? '').trim();
    const description = String(body.description ?? '').trim();
    const priority = String(body.priority ?? 'NORMAL');
    const requestedDeadline = body.requestedDeadline ? new Date(body.requestedDeadline) : null;
    const estimatedBudget = body.estimatedBudget ? Number(body.estimatedBudget) : null;
    const fieldValues: Array<{ fieldId: string; valueText?: string; valueNumber?: number; valueDate?: Date }> = body.fieldValues ?? [];

    if (!session.customerId) return fail('Only customer accounts can submit quote requests.', 403);
    if (!serviceId) return fail('Please select a service.', 422);
    if (!subject || !description) return fail('Subject and description are required.', 422);

    const service = await db.service.findUnique({ where: { id: serviceId }, include: { fields: { where: { isActive: true } } } });
    if (!service) return fail('Selected service is not available.', 422);

    // Validate required fields server-side
    for (const f of service.fields) {
      if (f.isRequired) {
        const v = fieldValues.find((x) => x.fieldId === f.id);
        if (!v || (v.valueText == null && v.valueNumber == null && v.valueDate == null)) {
          return fail(`Field "${f.label}" is required.`, 422);
        }
      }
    }

    const count = await db.quoteRequest.count();
    const requestNumber = generateReference('REQ', count + 1);

    const qr = await db.quoteRequest.create({ data: {
      requestNumber, customerId: session.customerId, serviceId, createdBy: session.id,
      subject, description, status: 'SUBMITTED', priority,
      requestedDeadline, estimatedBudget,
    }});

    if (fieldValues.length) {
      await db.quoteRequestValue.createMany({ data: fieldValues.map(v => ({
        quoteRequestId: qr.id, serviceFieldId: v.fieldId,
        valueText: v.valueText ?? null, valueNumber: v.valueNumber ?? null, valueDate: v.valueDate ?? null,
      }))});
    }

    await audit({ actorId: session.id, action: 'quote_request.created', entityType: 'quote_request', entityId: qr.id, newValues: { requestNumber, serviceId, subject }});

    // Notify admins
    const admins = await db.user.findMany({ where: { role: { in: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES'] }, status: 'ACTIVE' }});
    await Promise.all(admins.map(a => notify({ userId: a.id, title: 'New quote request', message: `${requestNumber} — ${subject}`, type: 'info', link: 'admin-quotations' })));

    return ok(qr, 'Your quote request has been submitted! We will prepare a quotation shortly.');
  });
}
