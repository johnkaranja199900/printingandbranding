import { db } from '@/lib/db';
import { ok, handleErrors, notFound } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return handleErrors(async () => {
    const { slug } = await params;
    const service = await db.service.findUnique({
      where: { slug },
      include: {
        category: true,
        fields: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!service || !service.isActive) return notFound('Service not found');
    return ok(service);
  });
}
