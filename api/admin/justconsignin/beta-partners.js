import { requireWebsiteOwner } from '../../_shared/auth.js';
import { allowOnly, clean, parseSupabase, readBody, validUuid } from '../../_shared/http.js';
import { supabaseUserRest } from '../../_shared/supabase.js';

const STATUSES = new Set([
  'new','reviewing','contacted','demo','accepted','waitlist',
  'installed','active','completed','declined',
]);

const SELECT = [
  'id','created_at','updated_at','first_name','last_name','business_name','email',
  'phone','business_website','shopify_store_url','shopify_status','monthly_item_volume',
  'current_system','biggest_problem','beta_goal','source_path','referrer','source_tag',
  'utm_source','utm_medium','utm_campaign','utm_content','utm_term','contact_consent',
  'marketing_consent','status','admin_notes','contacted_at','accepted_at','installed_at',
  'email_notified_at','email_notification_error','metadata',
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
          `beta_applications?select=${encodeURIComponent(SELECT)}&order=created_at.desc&limit=500`,
          { method: 'GET' },
        ),
        'Unable to load beta applications.',
      );
      return res.status(200).json({ applications: Array.isArray(rows) ? rows : [] });
    } catch (error) {
      console.error('[justconsignin] beta partners GET failed', error);
      return res.status(500).json({ error: 'Unable to load beta applications.' });
    }
  }

  const body = readBody(req);
  const id = clean(body.id, 80);
  if (!validUuid(id)) return res.status(400).json({ error: 'A valid application ID is required.' });

  if (req.method === 'PATCH') {
    const now = new Date().toISOString();
    const patch = { updated_at: now };

    if (Object.prototype.hasOwnProperty.call(body, 'status')) {
      const status = clean(body.status, 30).toLowerCase();
      if (!STATUSES.has(status)) return res.status(400).json({ error: 'Invalid application status.' });
      patch.status = status;
      if (status === 'contacted') patch.contacted_at = now;
      if (status === 'accepted') patch.accepted_at = now;
      if (status === 'installed') patch.installed_at = now;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'adminNotes')) {
      patch.admin_notes = clean(body.adminNotes, 8000) || null;
    }

    if (Object.keys(patch).length === 1) return res.status(400).json({ error: 'Nothing to update.' });

    try {
      const rows = await parseSupabase(
        await supabaseUserRest(
          owner.accessToken,
          `beta_applications?id=eq.${encodeURIComponent(id)}&select=${encodeURIComponent(SELECT)}`,
          {
            method: 'PATCH',
            headers: { Prefer: 'return=representation' },
            body: JSON.stringify(patch),
          },
        ),
        'Unable to update beta application.',
      );
      if (!rows?.[0]) return res.status(404).json({ error: 'Beta application not found.' });
      return res.status(200).json({ application: rows[0] });
    } catch (error) {
      console.error('[justconsignin] beta partners PATCH failed', error);
      return res.status(500).json({ error: 'Unable to update beta application.' });
    }
  }

  try {
    const rows = await parseSupabase(
      await supabaseUserRest(
        owner.accessToken,
        `beta_applications?id=eq.${encodeURIComponent(id)}&select=id`,
        { method: 'DELETE', headers: { Prefer: 'return=representation' } },
      ),
      'Unable to delete beta application.',
    );
    if (!rows?.[0]) return res.status(404).json({ error: 'Beta application not found.' });
    return res.status(200).json({ ok: true, id: rows[0].id });
  } catch (error) {
    console.error('[justconsignin] beta partners DELETE failed', error);
    return res.status(500).json({ error: 'Unable to delete beta application.' });
  }
}
