import { db } from '@/lib/db';
import { ok, fail, handleErrors } from '@/lib/api';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return handleErrors(async () => {
    const body = await req.json();
    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const phone = String(body.phone ?? '').trim();
    const subject = String(body.subject ?? '').trim();
    const message = String(body.message ?? '').trim();

    if (!name || !email || !subject || !message) {
      return fail('Name, email, subject and message are required.', 422);
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) return fail('Please enter a valid email.', 422);

    const rec = await db.contactMessage.create({ data: { name, email, phone, subject, message, status: 'new' }});
    await audit({ action: 'contact.created', entityType: 'contact', entityId: rec.id, newValues: { email, subject } });
    return ok(rec, 'Thank you for reaching out! We will get back to you shortly.');
  });
}
