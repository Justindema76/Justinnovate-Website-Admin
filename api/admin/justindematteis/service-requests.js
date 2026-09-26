import { requireWebsiteOwner } from '../../_shared/auth.js';
import { allowOnly, clean, parseSupabase, readBody, validUuid } from '../../_shared/http.js';
import { SITE_KEYS } from '../../_shared/siteRegistry.js';
import { supabaseUserRest } from '../../_shared/supabase.js';

const SITE_KEY = SITE_KEYS.JUSTIN;
const STATUSES = new Set([
  'new','reviewing','needs_quote','contacted','discovery',
  'proposal_sent','accepted','in_progress','complete','declined','spam',
]);

const SELECT = [
  'id','site_key','created_at','updated_at','name','email','phone','company','website',
  'requested_service','budget_range','timeline','message','contact_consent','status',
  'status_changed_at','routed_queue','ai_primary_service','ai_secondary_services',
  'ai_priority','ai_summary','ai_confidence','ai_provider','ai_model','source_path',
  'referrer','utm_source','utm_medium','utm_campaign','utm_content','utm_term',
  'metadata','admin_notes','contacted_at','email_notification_attempted_at',
  'email_notified_at','email_notification_error','assigned_department_id',
  'assigned_department_name','assigned_at','quote_requested_at','quote_number',
  'quote_amount','last_activity','last_activity_at','next_action','next_action_due_at',
].join(',');

function cleanDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Invalid date.');
  return date.toISOString();
}

export default async function handler(req, res) {
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;
  if (!allowOnly(req, res, ['GET','PATCH','DELETE'])) return;

  if (req.method === 'GET') {
    try {
      const query = `service_requests?site_key=eq.${SITE_KEY}&select=${encodeURIComponent(SELECT)}&order=created_at.desc&limit=500`;
      const rows = await parseSupabase(
        await supabaseUserRest(owner.accessToken, query, { method: 'GET' }),
        'Unable to load service requests.',
      );
      return res.status(200).json({ requests: Array.isArray(rows) ? rows : [] });
    } catch (error) {
      console.error('[justindematteis] service requests GET failed', error);
      return res.status(500).json({ error: 'Unable to load service requests.' });
    }
  }

  const body = readBody(req);
  const id = clean(body.id, 80);
  if (!validUuid(id)) return res.status(400).json({ error: 'A valid request ID is required.' });

  if (req.method === 'PATCH') {
    const now = new Date().toISOString();
    const patch = { updated_at: now };

    try {
      if (Object.prototype.hasOwnProperty.call(body, 'status')) {
        const status = clean(body.status, 30).toLowerCase();
        if (!STATUSES.has(status)) return res.status(400).json({ error: 'Invalid request status.' });
        patch.status = status;
        patch.status_changed_at = now;
        patch.last_activity = `Status changed to ${status.replace(/_/g, ' ')}`;
        patch.last_activity_at = now;
        if (status === 'contacted') patch.contacted_at = now;
      }

      if (Object.prototype.hasOwnProperty.call(body, 'adminNotes')) {
        patch.admin_notes = clean(body.adminNotes, 8000) || null;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'quoteNumber')) {
        patch.quote_number = clean(body.quoteNumber, 80) || null;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'quoteAmount')) {
        const amount = Number(body.quoteAmount);
        if (body.quoteAmount !== '' && (!Number.isFinite(amount) || amount < 0)) {
          return res.status(400).json({ error: 'Quote amount must be a positive number.' });
        }
        patch.quote_amount = body.quoteAmount === '' ? null : amount;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'nextAction')) {
        patch.next_action = clean(body.nextAction, 500) || null;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'nextActionDueAt')) {
        patch.next_action_due_at = cleanDate(body.nextActionDueAt);
      }
      if (Object.prototype.hasOwnProperty.call(body, 'lastActivity')) {
        patch.last_activity = clean(body.lastActivity, 500) || null;
        patch.last_activity_at = now;
      }

      if (Object.keys(patch).length === 1) {
        return res.status(400).json({ error: 'Nothing to update.' });
      }

      const query = `service_requests?id=eq.${encodeURIComponent(id)}&site_key=eq.${SITE_KEY}&select=${encodeURIComponent(SELECT)}`;
      const rows = await parseSupabase(
        await supabaseUserRest(owner.accessToken, query, {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(patch),
        }),
        'Unable to update service request.',
      );

      if (!rows?.[0]) return res.status(404).json({ error: 'Service request not found.' });
      return res.status(200).json({ request: rows[0] });
    } catch (error) {
      console.error('[justindematteis] service requests PATCH failed', error);
      return res.status(500).json({ error: error.message || 'Unable to update service request.' });
    }
  }

  try {
    const query = `service_requests?id=eq.${encodeURIComponent(id)}&site_key=eq.${SITE_KEY}&select=id`;
    const rows = await parseSupabase(
      await supabaseUserRest(owner.accessToken, query, {
        method: 'DELETE',
        headers: { Prefer: 'return=representation' },
      }),
      'Unable to delete service request.',
    );

    if (!rows?.[0]) return res.status(404).json({ error: 'Service request not found.' });
    return res.status(200).json({ ok: true, id: rows[0].id });
  } catch (error) {
    console.error('[justindematteis] service requests DELETE failed', error);
    return res.status(500).json({ error: 'Unable to delete service request.' });
  }
}
