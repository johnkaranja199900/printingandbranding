import { db } from '@/lib/db';
import { ok, fail, handleErrors, notFound, unauthorized } from '@/lib/api';
import { requireSession } from '@/lib/auth';
import { audit, notify } from '@/lib/audit';
import { toNumber } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleErrors(async () => {
    const session = await requireSession();
    if (!['SUPER_ADMIN', 'ADMIN', 'INVENTORY_MANAGER'].includes(session.role)) return unauthorized();
    const { id } = await params;
    const body = await req.json();
    const item = await db.inventoryItem.findUnique({ where: { id } });
    if (!item) return notFound('Item not found');

    // Stock adjustment
    if (body.adjustment !== undefined) {
      const adj = Number(body.adjustment);
      const reason = String(body.reason ?? 'Manual adjustment');
      const newQty = toNumber(item.quantity) + adj;
      if (newQty < 0) return fail('Cannot reduce below zero.', 422);

      await db.$transaction(async (tx) => {
        await tx.inventoryItem.update({ where: { id }, data: { quantity: newQty }});
        await tx.inventoryTransaction.create({ data: {
          itemId: id, type: 'ADJUSTMENT', quantity: Math.abs(adj), unitCost: toNumber(item.unitCost),
          reference: reason, notes: adj < 0 ? `Reduced by ${Math.abs(adj)}` : `Added ${adj}`, actorId: session.id,
        }});
      });
      await audit({ actorId: session.id, action: 'inventory.adjusted', entityType: 'inventory_item', entityId: id, newValues: { from: item.quantity, to: newQty, reason }});

      // Low-stock alert
      if (newQty <= toNumber(item.reorderLevel)) {
        const invManagers = await db.user.findMany({ where: { role: { in: ['SUPER_ADMIN', 'ADMIN', 'INVENTORY_MANAGER'] }, status: 'ACTIVE' }});
        await Promise.all(invManagers.map(u => notify({ userId: u.id, title: 'Low stock alert', message: `${item.name} (${item.sku}) is at ${newQty} ${item.unit}.`, type: 'warning', link: 'admin-inventory' })));
      }
      return ok(null, 'Stock adjusted.');
    }

    // Generic update
    const data: any = {};
    for (const k of ['name', 'category', 'unit', 'reorderLevel', 'unitCost', 'supplierId', 'location', 'description']) {
      if (body[k] !== undefined) data[k] = body[k];
    }
    const updated = await db.inventoryItem.update({ where: { id }, data });
    await audit({ actorId: session.id, action: 'inventory.updated', entityType: 'inventory_item', entityId: id, newValues: data });
    return ok(updated, 'Item updated.');
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleErrors(async () => {
    const session = await requireSession();
    if (!['SUPER_ADMIN', 'ADMIN'].includes(session.role)) return unauthorized();
    const { id } = await params;
    const item = await db.inventoryItem.findUnique({ where: { id } });
    if (!item) return notFound('Item not found');
    await db.inventoryItem.update({ where: { id }, data: { isActive: false }});
    await audit({ actorId: session.id, action: 'inventory.deleted', entityType: 'inventory_item', entityId: id });
    return ok(null, 'Item removed.');
  });
}
