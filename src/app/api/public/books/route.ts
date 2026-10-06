import { db } from '@/lib/db';
import { ok, handleErrors, paginate, withMeta } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return handleErrors(async () => {
    const url = new URL(req.url);
    const { page, pageSize, skip, take } = paginate(url.searchParams);
    const featuredOnly = url.searchParams.get('featured') === 'true';
    const authorId = url.searchParams.get('authorId');

    // Public browsing: only published books.
    // When authorId is provided (author portal case), include all books for
    // that author (drafts, manuscripts in progress, etc.) so authors can
    // manage their full catalogue. For other authors' books, still apply
    // isPublished: true.
    const where = authorId
      ? { authorId, ...(featuredOnly ? { isFeatured: true } : {}) }
      : { isPublished: true, ...(featuredOnly ? { isFeatured: true } : {}) };

    const [books, total] = await Promise.all([
      db.book.findMany({
        where,
        orderBy: { isFeatured: 'desc' },
        skip,
        take,
        include: {
          author: { select: { id: true, firstName: true, lastName: true, penName: true } },
        },
      }),
      db.book.count({ where }),
    ]);
    return ok(withMeta(books, total, page, pageSize));
  });
}
