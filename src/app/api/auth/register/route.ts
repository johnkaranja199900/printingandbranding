import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { ok, fail, handleErrors } from '@/lib/api';
import { generateReference } from '@/lib/types';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return handleErrors(async () => {
    const body = await req.json();
    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const phone = String(body.phone ?? '').trim();
    const password = String(body.password ?? '');
    const accountType = String(body.accountType ?? 'customer'); // 'customer' | 'author'
    const businessName = String(body.businessName ?? '').trim() || null;

    if (!name || !email || !phone || !password) {
      return fail('All fields are required.', 422);
    }
    if (password.length < 8) {
      return fail('Password must be at least 8 characters.', 422);
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return fail('Please enter a valid email address.', 422);
    }

    const existing = await db.user.findFirst({
      where: { OR: [{ email }, ...(phone ? [{ phone }] : [])] },
    });
    if (existing) return fail('An account with this email or phone already exists.', 409);

    const role = accountType === 'author' ? 'AUTHOR' : 'CUSTOMER';

    const user = await db.user.create({ data: {
      name, email, phone, role, status: 'ACTIVE',
      passwordHash: hashPassword(password), emailVerifiedAt: new Date(),
    }});

    if (accountType === 'author') {
      const count = await db.author.count();
      const authorNumber = generateReference('AUT', count + 1);
      const [firstName, ...rest] = name.split(' ');
      await db.author.create({ data: {
        userId: user.id, authorNumber, firstName, lastName: rest.join(' '),
        email, phone, status: 'active',
      }});
    } else {
      const count = await db.customer.count();
      const customerNumber = generateReference('CUS', count + 1);
      const [firstName, ...rest] = name.split(' ');
      await db.customer.create({ data: {
        userId: user.id, customerNumber, customerType: businessName ? 'BUSINESS' : 'INDIVIDUAL',
        businessName, firstName, lastName: rest.join(' '),
        phone, email, status: 'ACTIVE',
      }});
    }

    await audit({ actorId: user.id, action: 'auth.register', entityType: 'user', entityId: user.id, newValues: { role } });

    return ok({ id: user.id, email: user.email, name: user.name, role: user.role }, 'Account created! Please sign in.');
  });
}
