import { db } from '@/lib/db';
import { ok, handleErrors } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handleErrors(async () => {
    const categories = await db.serviceCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        services: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true, name: true, slug: true, description: true, pricingType: true,
            basePrice: true, unitName: true, estimatedDays: true, isFeatured: true,
          },
        },
      },
    });
    return ok(categories);
  });
}
