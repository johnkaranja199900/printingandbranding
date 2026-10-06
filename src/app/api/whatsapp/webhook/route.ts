// WhatsApp Business API webhook endpoint.
// - GET: webhook verification (Meta sends hub.mode=subscribe, hub.verify_token, hub.challenge)
// - POST: incoming messages from WhatsApp users.
//
// Configure this URL in the Meta WhatsApp Manager as the webhook callback.
// Set WHATSAPP_VERIFY_TOKEN in your environment to the verify token you choose there.
//
// Replies are generated privacy-first via the bot service and (in production) sent back
// via the Meta Cloud API. The bot NEVER discloses sensitive customer information.

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyWebhookToken, parseWhatsAppPayload, handleIncomingWhatsAppMessage, sendWhatsAppReply } from '@/lib/whatsapp-bot';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// Webhook verification
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const challengeResult = verifyWebhookToken(mode, token, challenge);
  if (challengeResult) {
    return new NextResponse(challengeResult, { status: 200, headers: { 'Content-Type': 'text/plain' }});
  }
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

// Incoming message
export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // Optional: verify X-Hub-Signature-256 header in production using WHATSAPP_APP_SECRET.
    // Skipped here for MVP — but the architecture note is that signature validation MUST be added
    // before going live, and the raw payload should be logged for troubleshooting.

    const parsed = parseWhatsAppPayload(payload);
    if (!parsed) {
      // Not a message event (could be a status update). Acknowledge so Meta doesn't retry.
      return NextResponse.json({ success: true, ignored: true });
    }

    const { fromPhone, body, toPhone } = parsed;
    const result = await handleIncomingWhatsAppMessage({ fromPhone, body, toPhone });

    // Attempt to send the reply back via WhatsApp (no-op in MVP)
    await sendWhatsAppReply(fromPhone, result.reply);

    // Audit log (no raw sensitive payload — just the event type)
    await audit({ action: 'whatsapp.message.received', entityType: 'whatsapp_message', newValues: { fromPhone, intent: result.intent, orderNumber: result.orderNumber, blocked: result.blocked }});

    // Notify staff if blocked or a sensitive request
    if (result.blocked) {
      const admins = await db.user.findMany({ where: { role: { in: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] }, status: 'ACTIVE' }, select: { id: true }});
      await Promise.all(admins.map(a => db.notification.create({ data: { userId: a.id, title: 'WhatsApp bot blocked a sensitive request', message: `From ${fromPhone}: "${body.slice(0, 80)}"`, type: 'warning', link: 'admin-whatsapp-bot' }})));
    }

    return NextResponse.json({ success: true, intent: result.intent, blocked: result.blocked });
  } catch (e: any) {
    console.error('WhatsApp webhook error:', e);
    // Still return 200 so Meta doesn't retry aggressively
    return NextResponse.json({ success: false, error: 'internal' }, { status: 200 });
  }
}
