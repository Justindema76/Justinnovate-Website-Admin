import { requireWebsiteOwner } from '../../_shared/auth.js';
import { allowOnly, clean, parseSupabase, readBody, validUuid } from '../../_shared/http.js';
import { SITE_KEYS } from '../../_shared/siteRegistry.js';
import { supabaseUserRest } from '../../_shared/supabase.js';

const SITE_KEY = SITE_KEYS.JUSTIN;
const STATUSES = new Set(['new','reviewing','contacted','interview','closed','spam']);
const SELECT = [
  'id','site_key','created_at','updated_at','name','company','email','phone',
  'website_or_linkedin','reason','role_title','message','employment_consent',
  'status','spam_score','spam_reasons','is_spam','source_path','referrer',
  'utm_source','utm_medium','utm_campaign','utm_content','utm_term','metadata',
  'admin_notes','contacted_at','email_notification_attempted_at','email_notified_at',
  'email_notification_error',
].join(',');

export default async function handler(req, res) {
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;
  if (!allowOnly(req, res, ['GET','PATCH','DELETE'])) return;

  if (req.method === 'GET') {
    try {
      const query = `hiring_contacts?site_key=eq.${SITE_KEY}&select=${encodeURIComponent(SELECT)}&order=created_at.desc&limit=500`;
      const rows = await parseSupabase(
        await supabaseUserRest(owner.accessToken, query, { method: 'GET' }),
        'Unable to load hiring contacts.',
      );
      return res.status(200).json({ contacts: Array.isArray(rows) ? rows : [] });
    } catch (error) {
      console.error('[justindematteis] hiring contacts GET failed', error);
      return res.status(500).json({ error: 'Unable to load hiring contacts.' });
    }
  }

  const body = readBody(req);
  const id = clean(body.id, 80);
  if (!validUuid(id)) return res.status(400).json({ error: 'A valid contact ID is required.' });

  if (req.method === 'PATCH') {
    const patch = { updated_at: new Date().toISOString() };

    if (Object.prototype.hasOwnProperty.call(body, 'status')) {
      const status = clean(body.status, 30).toLowerCase();
      if (!STATUSES.has(status)) return res.status(400).json({ error: 'Invalid hiring contact status.' });
      patch.status = status;
      patch.is_spam = status === 'spam';
      if (status === 'contacted' || status === 'interview') patch.contacted_at = new Date().toISOString();
    }
    if (Object.prototype.hasOwnProperty.call(body, 'adminNotes')) {
      patch.admin_notes = clean(body.adminNotes, 8000) || null;
    }

    if (Object.keys(patch).length === 1) return res.status(400).json({ error: 'Nothing to update.' });

    try {
      const query = `hiring_contacts?id=eq.${encodeURIComponent(id)}&site_key=eq.${SITE_KEY}&select=${encodeURIComponent(SELECT)}`;
      const rows = await parseSupabase(
        await supabaseUserRest(owner.accessToken, query, {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(patch),
        }),
        'Unable to update hiring contact.',
      );

      if (!rows?.[0]) return res.status(404).json({ error: 'Hiring contact not found.' });
      return res.status(200).json({ contact: rows[0] });
    } catch (error) {
      console.error('[justindematteis] hiring contacts PATCH failed', error);
      return res.status(500).json({ error: 'Unable to update hiring contact.' });
    }
  }

  try {
    const query = `hiring_contacts?id=eq.${encodeURIComponent(id)}&site_key=eq.${SITE_KEY}&select=id`;
    const rows = await parseSupabase(
      await supabaseUserRest(owner.accessToken, query, {
        method: 'DELETE',
        headers: { Prefer: 'return=representation' },
      }),
      'Unable to delete hiring contact.',
    );
    if (!rows?.[0]) return res.status(404).json({ error: 'Hiring contact not found.' });
    return res.status(200).json({ ok: true, id: rows[0].id });
  } catch (error) {
    console.error('[justindematteis] hiring contacts DELETE failed', error);
    return res.status(500).json({ error: 'Unable to delete hiring contact.' });
  }
}
