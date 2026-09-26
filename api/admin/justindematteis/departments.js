import { requireWebsiteOwner } from '../../_shared/auth.js';
import { allowOnly, clean, parseSupabase, readBody, validUuid } from '../../_shared/http.js';
import { SITE_KEYS } from '../../_shared/siteRegistry.js';
import { supabaseUserRest } from '../../_shared/supabase.js';

const SITE_KEY = SITE_KEYS.JUSTIN;
const SELECT = 'id,site_key,name,active,sort_order,created_at,updated_at';

export default async function handler(req, res) {
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;
  if (!allowOnly(req, res, ['GET','POST','PATCH','DELETE'])) return;

  if (req.method === 'GET') {
    try {
      const query = `agency_departments?site_key=eq.${SITE_KEY}&select=${encodeURIComponent(SELECT)}&order=sort_order.asc,name.asc`;
      const rows = await parseSupabase(
        await supabaseUserRest(owner.accessToken, query, { method: 'GET' }),
        'Unable to load departments.',
      );
      return res.status(200).json({ departments: Array.isArray(rows) ? rows : [] });
    } catch (error) {
      console.error('[justindematteis] departments GET failed', error);
      return res.status(500).json({ error: 'Unable to load departments.' });
    }
  }

  const body = readBody(req);

  if (req.method === 'POST') {
    const name = clean(body.name, 120);
    if (!name) return res.status(400).json({ error: 'Department name is required.' });

    try {
      const rows = await parseSupabase(
        await supabaseUserRest(owner.accessToken, `agency_departments?select=${encodeURIComponent(SELECT)}`, {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({
            site_key: SITE_KEY,
            name,
            email: '',
            active: body.active !== false,
            sort_order: Number(body.sortOrder) || 0,
          }),
        }),
        'Unable to create department.',
      );
      return res.status(201).json({ department: rows?.[0] || null });
    } catch (error) {
      console.error('[justindematteis] departments POST failed', error);
      return res.status(500).json({ error: 'Unable to create department.' });
    }
  }

  const id = clean(body.id, 80);
  if (!validUuid(id)) return res.status(400).json({ error: 'A valid department ID is required.' });

  if (req.method === 'PATCH') {
    const patch = { updated_at: new Date().toISOString() };
    if (Object.prototype.hasOwnProperty.call(body, 'name')) {
      const name = clean(body.name, 120);
      if (!name) return res.status(400).json({ error: 'Department name is required.' });
      patch.name = name;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'active')) patch.active = body.active !== false;
    if (Object.prototype.hasOwnProperty.call(body, 'sortOrder')) patch.sort_order = Number(body.sortOrder) || 0;

    try {
      const query = `agency_departments?id=eq.${encodeURIComponent(id)}&site_key=eq.${SITE_KEY}&select=${encodeURIComponent(SELECT)}`;
      const rows = await parseSupabase(
        await supabaseUserRest(owner.accessToken, query, {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(patch),
        }),
        'Unable to update department.',
      );
      if (!rows?.[0]) return res.status(404).json({ error: 'Department not found.' });
      return res.status(200).json({ department: rows[0] });
    } catch (error) {
      console.error('[justindematteis] departments PATCH failed', error);
      return res.status(500).json({ error: 'Unable to update department.' });
    }
  }

  try {
    const query = `agency_departments?id=eq.${encodeURIComponent(id)}&site_key=eq.${SITE_KEY}&select=id`;
    const rows = await parseSupabase(
      await supabaseUserRest(owner.accessToken, query, {
        method: 'DELETE',
        headers: { Prefer: 'return=representation' },
      }),
      'Unable to delete department.',
    );
    if (!rows?.[0]) return res.status(404).json({ error: 'Department not found.' });
    return res.status(200).json({ ok: true, id: rows[0].id });
  } catch (error) {
    console.error('[justindematteis] departments DELETE failed', error);
    return res.status(500).json({ error: 'Unable to delete department.' });
  }
}
