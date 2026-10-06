import { db } from '@/lib/db';
import { ok, fail, handleErrors, unauthorized, paginate, withMeta, notFound } from '@/lib/api';
import { requireSession } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { toNumber } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return handleErrors(async () => {
    const session = await requireSession();
    if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'INVENTORY_MANAGER'].includes(session.role)) return unauthorized();
    const url = new URL(req.url);
    const { page, pageSize, skip, take } = paginate(url.searchParams);
    const search = url.searchParams.get('search');
    const where: any = { isActive: true };
    if (search) where.OR = [{ name: { contains: search } }, { sku: { contains: search } }];

    const [items, total] = await Promise.all([
      db.inventoryItem.findMany({ where, orderBy: { name: 'asc' }, skip, take, include: { supplier: { select: { name: true } } } }),
      db.inventoryItem.count({ where }),
    ]);
    return ok(withMeta(items, total, page, pageSize));
  });
}

export async function POST(req: Request) {
  return handleErrors(async () => {
    const session = await requireSession();
    if (!['SUPER_ADMIN', 'ADMIN', 'INVENTORY_MANAGER'].includes(session.role)) return unauthorized();
    const body = await req.json();
    const name = String(body.name ?? '').trim();
    const sku = String(body.sku ?? '').trim().toUpperCase();
    const category = String(body.category ?? 'General').trim();
    const unit = String(body.unit ?? 'pcs').trim();
    const quantity = Number(body.quantity ?? 0);
    const reorderLevel = Number(body.reorderLevel ?? 0);
    const unitCost = Number(body.unitCost ?? 0);

    if (!name || !sku) return fail('Name and SKU are required.', 422);
    const existing = await db.inventoryItem.findUnique({ where: { sku } });
    if (existing) return fail('An item with this SKU already exists.', 409);

    const item = await db.inventoryItem.create({ data: {
      name, sku, category, unit, quantity, reorderLevel, unitCost, supplierId: body.supplierId || null,
      description: body.description ?? null, location: body.location ?? null, isActive: true,
    }});
    if (quantity > 0) {
      await db.inventoryTransaction.create({ data: {
        itemId: item.id, type: 'PURCHASE', quantity, unitCost, reference: 'Initial stock', actorId: session.id,
      }});
    }
    await audit({ actorId: session.id, action: 'inventory.created', entityType: 'inventory_item', entityId: item.id, newValues: { sku, name, quantity }});
    return ok(item, 'Inventory item created.');
  });
}
