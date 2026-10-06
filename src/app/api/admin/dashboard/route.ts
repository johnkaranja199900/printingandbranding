import { db } from '@/lib/db';
import { ok, handleErrors, unauthorized } from '@/lib/api';
import { requireSession } from '@/lib/auth';
import { toNumber } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handleErrors(async () => {
    const session = await requireSession();
    if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES', 'FINANCE', 'PRODUCTION', 'INVENTORY_MANAGER'].includes(session.role)) {
      return unauthorized();
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      allOrders, todayPayments, monthPayments, allPayments,
      pendingQuotes, activeOrders, inProduction, completedOrders, lowStockItems,
      customersCount, booksCount, authorsCount, staff, inventoryItemsCount,
      recentActivity, notifications,
    ] = await Promise.all([
      db.order.findMany({ select: { total: true, status: true, paymentStatus: true, createdAt: true } }),
      db.payment.findMany({ where: { status: 'SUCCESSFUL', paidAt: { gte: startOfToday } }, select: { amount: true, method: true } }),
      db.payment.findMany({ where: { status: 'SUCCESSFUL', paidAt: { gte: startOfMonth } }, select: { amount: true, method: true } }),
      db.payment.findMany({ where: { status: 'SUCCESSFUL' }, select: { amount: true, method: true } }),
      db.quoteRequest.count({ where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'PRICING'] }} }),
      db.order.count({ where: { status: { in: ['PENDING', 'CONFIRMED', 'AWAITING_PAYMENT', 'QUEUED'] }} }),
      db.order.count({ where: { status: { in: ['IN_PRODUCTION', 'QUALITY_CHECK'] }} }),
      db.order.count({ where: { status: 'COMPLETED' }}),
      db.inventoryItem.findMany({ where: { isActive: true }, select: { name: true, sku: true, quantity: true, reorderLevel: true, unit: true } }),
      db.customer.count(),
      db.book.count(),
      db.author.count(),
      db.user.findMany({ where: { role: { not: 'CUSTOMER' } }, select: { id: true, name: true, role: true, status: true } }),
      db.inventoryItem.count({ where: { isActive: true } }),
      db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 8, include: { actor: { select: { name: true } } } }),
      db.notification.findMany({ where: { userId: session.id }, orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);

    const totalSales = allPayments.reduce((s, p) => s + toNumber(p.amount), 0);
    const todaySales = todayPayments.reduce((s, p) => s + toNumber(p.amount), 0);
    const monthSales = monthPayments.reduce((s, p) => s + toNumber(p.amount), 0);
    const outstanding = allOrders.reduce((s, o) => s + toNumber(o.total) - (o.paymentStatus === 'PAID' ? toNumber(o.total) : 0), 0) * 0; // recalc below
    const unpaidOrders = allOrders.filter(o => o.paymentStatus !== 'PAID').length;
    const outstandingAmount = allOrders.reduce((s, o) => s + (o.paymentStatus === 'PAID' ? 0 : toNumber(o.total) - (o.paymentStatus === 'PARTIALLY_PAID' ? toNumber(o.total) * 0.5 : 0)), 0);

    // Sales by method
    const byMethod: Record<string, number> = {};
    for (const p of allPayments) byMethod[p.method] = (byMethod[p.method] ?? 0) + toNumber(p.amount);

    // Orders by status
    const ordersByStatus: Record<string, number> = {};
    for (const o of allOrders) ordersByStatus[o.status] = (ordersByStatus[o.status] ?? 0) + 1;

    // Monthly sales trend (last 7 months)
    const monthlyTrend: { month: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthTotal = allPayments
        .filter(p => { const pd = p.paidAt ?? new Date(0); return pd >= d && pd < end; })
        .reduce((s, p) => s + toNumber(p.amount), 0);
      monthlyTrend.push({ month: d.toLocaleString('en', { month: 'short' }), total: monthTotal });
    }

    // Low stock
    const lowStock = lowStockItems.filter(i => toNumber(i.quantity) <= toNumber(i.reorderLevel));

    return ok({
      kpis: {
        totalOrders: allOrders.length,
        pendingQuotes,
        activeOrders,
        inProduction,
        completedOrders,
        unpaidOrders,
        totalSales,
        todaySales,
        monthSales,
        outstandingAmount,
        customersCount,
        booksCount,
        authorsCount,
        staffCount: staff.length,
        inventoryItemsCount,
        unreadNotifications: notifications.filter(n => !n.isRead).length,
      },
      charts: {
        monthlyTrend,
        byMethod: Object.entries(byMethod).map(([name, value]) => ({ name, value })),
        ordersByStatus: Object.entries(ordersByStatus).map(([name, value]) => ({ name, value })),
      },
      lowStock,
      recentActivity,
      notifications,
      staff,
    });
  });
}
