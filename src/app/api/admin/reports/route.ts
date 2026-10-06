import { db } from '@/lib/db';
import { ok, handleErrors, unauthorized } from '@/lib/api';
import { requireSession } from '@/lib/auth';
import { toNumber } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return handleErrors(async () => {
    const session = await requireSession();
    if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'].includes(session.role)) return unauthorized();
    const url = new URL(req.url);
    const from = url.searchParams.get('from') ? new Date(url.searchParams.get('from')!) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = url.searchParams.get('to') ? new Date(url.searchParams.get('to')!) : new Date();

    const [payments, orders, quotations, inventoryItems, books, customers, staff] = await Promise.all([
      db.payment.findMany({ where: { status: 'SUCCESSFUL', paidAt: { gte: from, lte: to } }, include: { order: { select: { orderNumber: true, items: { include: { service: { select: { name: true, category: { select: { name: true } } } } } } } }, customer: { select: { firstName: true, lastName: true, businessName: true } } } }),
      db.order.findMany({ where: { createdAt: { gte: from, lte: to } }, include: { customer: true, items: true } }),
      db.quotation.findMany({ where: { createdAt: { gte: from, lte: to } } }),
      db.inventoryItem.findMany({ where: { isActive: true }, include: { supplier: true } }),
      db.book.findMany({ include: { author: true } }),
      db.customer.findMany({ include: { orders: { select: { total: true, amountPaid: true } } } }),
      db.user.findMany({ where: { role: { not: 'CUSTOMER' } }, include: { ordersAssigned: { select: { id: true, status: true } } } }),
    ]);

    // Sales by service category
    const byCategory: Record<string, number> = {};
    for (const p of payments) {
      for (const it of p.order?.items ?? []) {
        const cat = it.service?.category?.name ?? 'Other';
        const share = toNumber(it.lineTotal);
        byCategory[cat] = (byCategory[cat] ?? 0) + share * 0.7; // approx revenue attribution
      }
    }

    // Sales by method
    const byMethod: Record<string, { count: number; total: number }> = {};
    for (const p of payments) {
      if (!byMethod[p.method]) byMethod[p.method] = { count: 0, total: 0 };
      byMethod[p.method].count++;
      byMethod[p.method].total += toNumber(p.amount);
    }

    // Outstanding balances
    const outstandingByCustomer = customers.map(c => {
      const totalDue = c.orders.reduce((s, o) => s + (toNumber(o.total) - toNumber(o.amountPaid ?? 0)), 0);
      return { customer: c.businessName || `${c.firstName} ${c.lastName}`, customerNumber: c.customerNumber, totalDue, orderCount: c.orders.length };
    }).filter(x => x.totalDue > 0).sort((a, b) => b.totalDue - a.totalDue);

    // Staff performance
    const staffPerf = staff.map(s => ({
      name: s.name, role: s.role,
      assignedOrders: s.ordersAssigned.length,
      completed: s.ordersAssigned.filter(o => o.status === 'COMPLETED').length,
      inProgress: s.ordersAssigned.filter(o => ['IN_PRODUCTION', 'QUALITY_CHECK'].includes(o.status)).length,
    }));

    const totalRevenue = payments.reduce((s, p) => s + toNumber(p.amount), 0);
    const totalOrders = orders.length;
    const quotationConversion = quotations.length ? Math.round(orders.filter(o => o.quotationId).length / quotations.length * 100) : 0;

    return ok({
      period: { from, to },
      summary: { totalRevenue, totalOrders, quotationCount: quotations.length, quotationConversion, outstanding: outstandingByCustomer.reduce((s, x) => s + x.totalDue, 0) },
      salesByCategory: Object.entries(byCategory).map(([name, value]) => ({ name, value })),
      salesByMethod: Object.entries(byMethod).map(([name, v]) => ({ name, ...v })),
      outstandingByCustomer,
      staffPerf,
      inventoryValue: inventoryItems.reduce((s, i) => s + toNumber(i.quantity) * toNumber(i.unitCost), 0),
      booksPublished: books.filter(b => b.publicationStatus === 'PUBLISHED').length,
      recentPayments: payments.slice(0, 15),
    });
  });
}
