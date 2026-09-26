import { requireWebsiteOwner } from '../../_shared/auth.js';
import { allowOnly, clean, readBody, validUuid } from '../../_shared/http.js';
import { supabaseAnonKey, supabaseUrl } from '../../_shared/supabase.js';

export default async function handler(req, res) {
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;
  if (!allowOnly(req, res, ['POST'])) return;

  const body = readBody(req);
  const requestId = clean(body.requestId, 80);
  const scheduledAt = clean(body.scheduledAt, 100);
  const durationMinutes = Number(body.durationMinutes || 30);
  const timezone = clean(body.timezone, 100);
  const location = clean(body.location, 1000);
  const notes = clean(body.notes, 6000);

  if (!validUuid(requestId)) return res.status(400).json({ error: 'A valid request ID is required.' });
  if (!scheduledAt || Number.isNaN(new Date(scheduledAt).getTime())) {
    return res.status(400).json({ error: 'Choose a valid date and time.' });
  }
  if (!Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 240) {
    return res.status(400).json({ error: 'Duration must be between 15 and 240 minutes.' });
  }

  try {
    const response = await fetch(`${supabaseUrl()}/functions/v1/send-site-email`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey(),
        Authorization: `Bearer ${owner.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'schedule',
        requestId,
        scheduledAt,
        durationMinutes,
        timezone,
        location,
        notes,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const status = response.status >= 400 && response.status < 500 ? response.status : 502;
      return res.status(status).json({ error: payload?.error || 'Unable to schedule demo.' });
    }
    return res.status(200).json(payload);
  } catch (error) {
    console.error('[justconsignin] demo request scheduling failed', error);
    return res.status(502).json({ error: 'Unable to schedule demo.' });
  }
}
