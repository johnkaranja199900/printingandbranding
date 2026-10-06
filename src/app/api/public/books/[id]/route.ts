import { db } from '@/lib/db';
import { ok, handleErrors, notFound } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleErrors(async () => {
    const { id } = await params;
    const book = await db.book.findFirst({
      where: { id, isPublished: true },
      include: { author: true, manuscripts: { orderBy: { versionNumber: 'desc' }, take: 3 } },
    });
    if (!book) return notFound('Book not found');
    return ok(book);
  });
}
