import { db } from '@/lib/db';
import { ok, fail, handleErrors, notFound, unauthorized } from '@/lib/api';
import { requireSession } from '@/lib/auth';
import { hashPassword } from '@/lib/auth';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleErrors(async () => {
    const session = await requireSession();
    if (!['SUPER_ADMIN', 'ADMIN'].includes(session.role)) return unauthorized();
    const { id } = await params;
    const body = await req.json();
    const user = await db.user.findUnique({ where: { id } });
    if (!user) return notFound('User not found');

    const data: any = {};
    if (body.name) data.name = body.name;
    if (body.phone) data.phone = body.phone;
    if (body.role) data.role = body.role;
    if (body.status) data.status = body.status;
    if (body.password) {
      if (body.password.length < 8) return fail('Password must be at least 8 characters.', 422);
      data.passwordHash = hashPassword(body.password);
    }
    const updated = await db.user.update({ where: { id }, data });
    await audit({ actorId: session.id, action: 'staff.updated', entityType: 'user', entityId: id, newValues: { name: data.name, role: data.role, status: data.status }});
    return ok({ id: updated.id, name: updated.name, email: updated.email, role: updated.role, status: updated.status }, 'User updated.');
  });
}
