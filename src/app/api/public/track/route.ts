import { db } from '@/lib/db';
import { ok, fail, handleErrors, notFound } from '@/lib/api';

export const dynamic = 'force-dynamic';

// Public order tracking — limited info, no sensitive data
export async function GET(req: Request) {
  return handleErrors(async () => {
    const url = new URL(req.url);
    const orderNumber = url.searchParams.get('orderNumber')?.trim().toUpperCase();
    const trackingToken = url.searchParams.get('trackingToken')?.trim();

    if (!orderNumber) return fail('Order number is required.', 422);

    const order = await db.order.findFirst({
      where: { orderNumber },
      select: {
        orderNumber: true, status: true, paymentStatus: true, currency: true,
        amountDue: true, total: true, expectedCompletionDate: true, actualCompletionDate: true,
        createdAt: true, trackingToken: true,
        items: { select: { description: true, quantity: true, status: true } },
        statusHistory: { orderBy: { createdAt: 'asc' }, select: { fromStatus: true, toStatus: true, reason: true, createdAt: true } },
        customer: { select: { firstName: true, lastName: true, customerType: true, businessName: true, city: true } },
      },
    });
    if (!order) return notFound('Order not found. Please check the order number.');

    // If a tracking token is provided, validate it (full access). Otherwise return limited info.
    const fullAccess = !!trackingToken && trackingToken === order.trackingToken;

    return ok({
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      currency: order.currency,
      amountDue: fullAccess ? order.amountDue : null,
      total: fullAccess ? order.total : null,
      expectedCompletionDate: order.expectedCompletionDate,
      actualCompletionDate: order.actualCompletionDate,
      createdAt: order.createdAt,
      customerName: order.customer.businessName || `${order.customer.firstName} ${order.customer.lastName?.[0] ?? ''}.`,
      customerCity: order.customer.city,
      items: order.items.map(i => ({ description: i.description, quantity: Number(i.quantity), status: i.status })),
      timeline: order.statusHistory,
      fullAccess,
    });
  });
}
