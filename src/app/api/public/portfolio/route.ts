import { db } from '@/lib/db';
import { ok, handleErrors, paginate, withMeta } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return handleErrors(async () => {
    const url = new URL(req.url);
    const { page, pageSize, skip, take } = paginate(url.searchParams);
    const category = url.searchParams.get('category');
    const where = { isPublished: true, ...(category && category !== 'All' ? { category } : {}) };
    const [items, total] = await Promise.all([
      db.portfolioItem.findMany({ where, orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }], skip, take }),
      db.portfolioItem.count({ where }),
    ]);
    return ok(withMeta(items, total, page, pageSize));
  });
}
