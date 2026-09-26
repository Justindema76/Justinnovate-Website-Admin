import { requireWebsiteOwner } from '../../_shared/auth.js';
import { allowOnly, clean, parseSupabase, readBody, validUuid } from '../../_shared/http.js';
import { supabaseUserRest } from '../../_shared/supabase.js';

const STATUSES = new Set(['new','contacted','scheduled','completed','archived']);
const SELECT = [
  'id','created_at','updated_at','first_name','last_name','business_name','email',
  'phone','shopify_status','interest','message','source_path','referrer','utm_source',
  'utm_medium','utm_campaign','utm_content','utm_term','status','admin_notes',
  'contacted_at','scheduled_at','scheduled_duration_minutes','scheduled_timezone',
  'scheduled_location','scheduled_notes','metadata',
].join(',');

export default async function handler(req, res) {
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;
  if (!allowOnly(req, res, ['GET','PATCH','DELETE'])) return;

  if (req.method === 'GET') {
    try {
      const rows = await parseSupabase(
        await supabaseUserRest(
          owner.accessToken,
          `demo_requests?select=${encodeURIComponent(SELECT)}&order=created_at.desc&limit=500`,
          { method: 'GET' },
        ),
        'Unable to load demo requests.',
      );
      return res.status(200).json({ requests: Array.isArray(rows) ? rows : [] });
    } catch (error) {
      console.error('[justconsignin] demo requests GET failed', error);
      return res.status(500).json({ error: 'Unable to load demo requests.' });
    }
  }

  const body = readBody(req);
  const id = clean(body.id, 80);
  if (!validUuid(id)) return res.status(400).json({ error: 'A valid request ID is required.' });

  if (req.method === 'PATCH') {
    const patch = { updated_at: new Date().toISOString() };

    if (Object.prototype.hasOwnProperty.call(body, 'status')) {
      const status = clean(body.status, 30).toLowerCase();
      if (!STATUSES.has(status)) return res.status(400).json({ error: 'Invalid request status.' });
      patch.status = status;
      if (status === 'contacted') patch.contacted_at = new Date().toISOString();
    }

    if (Object.prototype.hasOwnProperty.call(body, 'adminNotes')) {
      patch.admin_notes = clean(body.adminNotes, 8000) || null;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'scheduledAt')) {
      const value = clean(body.scheduledAt, 80);
      if (!value) patch.scheduled_at = null;
      else {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return res.status(400).json({ error: 'Invalid scheduled date.' });
        patch.scheduled_at = date.toISOString();
      }
    }

    if (Object.keys(patch).length === 1) return res.status(400).json({ error: 'Nothing to update.' });

    try {
      const rows = await parseSupabase(
        await supabaseUserRest(
          owner.accessToken,
          `demo_requests?id=eq.${encodeURIComponent(id)}&select=${encodeURIComponent(SELECT)}`,
          {
            method: 'PATCH',
            headers: { Prefer: 'return=representation' },
            body: JSON.stringify(patch),
          },
        ),
        'Unable to update demo request.',
      );
      if (!rows?.[0]) return res.status(404).json({ error: 'Demo request not found.' });
      return res.status(200).json({ request: rows[0] });
    } catch (error) {
      console.error('[justconsignin] demo requests PATCH failed', error);
      return res.status(500).json({ error: 'Unable to update demo request.' });
    }
  }

  try {
    const rows = await parseSupabase(
      await supabaseUserRest(
        owner.accessToken,
        `demo_requests?id=eq.${encodeURIComponent(id)}&select=id`,
        { method: 'DELETE', headers: { Prefer: 'return=representation' } },
      ),
      'Unable to delete demo request.',
    );
    if (!rows?.[0]) return res.status(404).json({ error: 'Demo request not found.' });
    return res.status(200).json({ ok: true, id: rows[0].id });
  } catch (error) {
    console.error('[justconsignin] demo requests DELETE failed', error);
    return res.status(500).json({ error: 'Unable to delete demo request.' });
  }
}
