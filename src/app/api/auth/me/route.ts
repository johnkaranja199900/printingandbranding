import { ok, handleErrors } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handleErrors(async () => {
    const session = await getSession();
    if (!session) return ok(null);

    const user = await db.user.findUnique({
      where: { id: session.id },
      select: {
        id: true, email: true, name: true, phone: true, role: true,
        avatarUrl: true,
        customer: { select: { id: true, customerNumber: true, customerType: true, businessName: true } },
        author: { select: { id: true, authorNumber: true, penName: true } },
      },
    });
    return ok(user);
  });
}
