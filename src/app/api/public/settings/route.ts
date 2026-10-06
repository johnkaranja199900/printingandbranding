import { db } from '@/lib/db';
import { ok, handleErrors } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handleErrors(async () => {
    const settings = await db.setting.findMany();
    const map: Record<string, string> = {};
    for (const s of settings) {
      // Only expose non-secret settings publicly
      if (['mpesa_environment', 'sms_provider', 'whatsapp_provider', 'mpesa_shortocode'].includes(s.group)) continue;
      map[s.key] = s.value;
    }
    return ok(map);
  });
}
