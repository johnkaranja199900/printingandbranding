import { db } from '@/lib/db';
import { ok, fail, handleErrors, notFound, unauthorized } from '@/lib/api';
import { getSession, requireSession } from '@/lib/auth';
import { audit, notify } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleErrors(async () => {
    const session = await requireSession();
    const { id } = await params;
    const order = await db.order.findUnique({
      where: { id },
      include: {
        customer: true, items: { include: { service: true } }, payments: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        productionJobs: { include: { assignee: { select: { name: true } }, qualityChecks: true } },
        quotation: { select: { quoteNumber: true, quoteNumber: true } },
      },
    });
    if (!order) return notFound('Order not found');
    if (session.role === 'CUSTOMER' && order.customerId !== session.customerId) return unauthorized();
    return ok(order);
  });
}

// Update order status (staff) — creates history entry
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleErrors(async () => {
    const session = await requireSession();
    if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES', 'PRODUCTION', 'DESIGNER', 'PUBLISHER'].includes(session.role)) return unauthorized();
    const { id } = await params;
    const body = await req.json();

    const order = await db.order.findUnique({ where: { id }, include: { customer: { include: { user: true } } } });
    if (!order) return notFound('Order not found');

    const updates: any = {};
    if (body.status) {
      if (body.status !== order.status) {
        await db.orderStatusHistory.create({ data: {
          orderId: id, fromStatus: order.status, toStatus: body.status,
          changedById: session.id, reason: body.reason ?? null, notes: body.notes ?? null,
        }});
        updates.status = body.status;
        if (body.status === 'COMPLETED') {
          updates.actualCompletionDate = new Date();
          updates.productionStatus = 'completed';
        } else if (body.status === 'IN_PRODUCTION') {
          updates.productionStatus = 'in_progress';
        } else if (body.status === 'QUALITY_CHECK') {
          updates.productionStatus = 'quality_check';
        } else if (body.status === 'READY') {
          updates.productionStatus = 'ready';
        }
      }
    }
    if (body.assignedToId !== undefined) updates.assignedToId = body.assignedToId || null;
    if (body.expectedCompletionDate) updates.expectedCompletionDate = new Date(body.expectedCompletionDate);
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.productionStatus) updates.productionStatus = body.productionStatus;

    const updated = await db.order.update({ where: { id }, data: updates });
    await audit({ actorId: session.id, action: 'order.updated', entityType: 'order', entityId: id, newValues: updates });

    // Notify customer on important transitions
    if (body.status && body.status !== order.status && order.customer?.user) {
      const messages: Record<string, string> = {
        CONFIRMED: 'Your order has been confirmed and is being prepared.',
        AWAITING_PAYMENT: 'Please proceed with payment for your order.',
        IN_PRODUCTION: 'Your order is now in production.',
        QUALITY_CHECK: 'Your order is undergoing quality checks.',
        READY: 'Your order is ready for collection!',
        COMPLETED: 'Your order has been completed. Thank you!',
        CANCELLED: 'Your order has been cancelled.',
      };
      const msg = messages[body.status];
      if (msg) {
        await notify({ userId: order.customer.user.id, title: `Order ${order.orderNumber} update`, message: msg, type: body.status === 'COMPLETED' || body.status === 'READY' ? 'success' : 'info', link: 'customer-orders' });
      }
    }

    return ok(updated, 'Order updated.');
  });
}
