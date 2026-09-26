import { requireWebsiteOwner } from '../../_shared/auth.js';
import { allowOnly, clean, parseSupabase, readBody, validUuid } from '../../_shared/http.js';
import { SITE_KEYS } from '../../_shared/siteRegistry.js';
import { supabaseUserRest } from '../../_shared/supabase.js';

const SITE_KEY = SITE_KEYS.JUSTIN;

export default async function handler(req, res) {
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;
  if (!allowOnly(req, res, ['POST'])) return;

  const body = readBody(req);
  const requestId = clean(body.requestId, 80);
  const departmentId = clean(body.departmentId, 80);

  if (!validUuid(requestId) || !validUuid(departmentId)) {
    return res.status(400).json({ error: 'A valid request and department are required.' });
  }

  try {
    const departments = await parseSupabase(
      await supabaseUserRest(
        owner.accessToken,
        `agency_departments?id=eq.${encodeURIComponent(departmentId)}&site_key=eq.${SITE_KEY}&active=eq.true&select=id,name,active&limit=1`,
        { method: 'GET' },
      ),
      'Unable to load department.',
    );

    const department = Array.isArray(departments) ? departments[0] : null;
    if (!department) return res.status(404).json({ error: 'Department not found.' });

    const now = new Date().toISOString();
    const patch = {
      status: 'needs_quote',
      status_changed_at: now,
      assigned_department_id: department.id,
      assigned_department_name: department.name,
      assigned_department_email: '',
      assigned_at: now,
      quote_requested_at: now,
      last_activity: `Assigned to ${department.name}`,
      last_activity_at: now,
      next_action: 'Prepare quote',
      next_action_due_at: null,
      updated_at: now,
    };

    const rows = await parseSupabase(
      await supabaseUserRest(
        owner.accessToken,
        `service_requests?id=eq.${encodeURIComponent(requestId)}&site_key=eq.${SITE_KEY}&select=id,status,status_changed_at,assigned_department_id,assigned_department_name,assigned_at,quote_requested_at,last_activity,last_activity_at,next_action,next_action_due_at,updated_at`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(patch),
        },
      ),
      'Unable to assign department.',
    );

    if (!rows?.[0]) return res.status(404).json({ error: 'Service request not found.' });

    return res.status(200).json({
      ok: true,
      assigned: true,
      request: rows[0],
      department: { id: department.id, name: department.name },
    });
  } catch (error) {
    console.error('[justindematteis] service request assignment failed', error);
    return res.status(500).json({ error: 'Unable to assign department.' });
  }
}
