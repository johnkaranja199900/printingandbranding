import { ok, handleErrors } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return handleErrors(async () => {
    const session = await getSession();
    if (session) {
      await audit({ actorId: session.id, action: 'auth.logout', entityType: 'user', entityId: session.id, ipAddress: req.headers.get('x-forwarded-for') ?? undefined });
    }
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
    return ok(null, 'Signed out successfully.');
  });
}
