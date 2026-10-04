import { requireWebsiteOwner } from '../../_shared/auth.js';
import { allowOnly, parseSupabase, readBody } from '../../_shared/http.js';
import { supabaseUserRest } from '../../_shared/supabase.js';
import { SITE_KEYS } from '../../_shared/siteRegistry.js';

const SITE_KEY = SITE_KEYS.SUNWINGS;
const ALLOWED_KEYS = new Set([
  'phone',
  'email',
  'hero_title',
  'hero_description',
  'hero_image',
  'hero_cta_label',
  'hero_cta_url',
  'site_name','logo_url','topbar_enabled','topbar_emphasis','topbar_text','call_button_enabled','call_button_text',
  'logo_desktop_width','logo_mobile_width','logo_desktop_max_height','logo_mobile_max_height',
  'logo_offset_x','logo_offset_y','header_desktop_height','header_mobile_height',
]);

export default async function handler(req, res) {
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;
  if (!allowOnly(req, res, ['GET','POST'])) return;

  try {
    if (req.method === 'GET') {
      const rows = await parseSupabase(
        await supabaseUserRest(
          owner.accessToken,
          `sunwings_site_settings?site_key=eq.${SITE_KEY}&select=site_key,key,value,updated_at&order=key.asc`,
          { method: 'GET' },
        ),
        'Unable to load Sunwings site settings.',
      );

      return res.status(200).json({
        settings: Object.fromEntries((rows || []).map(row => [row.key, row.value])),
      });
    }

    const body = readBody(req);
    const settings = body.settings && typeof body.settings === 'object'
      ? body.settings
      : body;

    const rows = Object.entries(settings)
      .filter(([key]) => ALLOWED_KEYS.has(key))
      .map(([key, value]) => ({
        site_key: SITE_KEY,
        key,
        value: String(value ?? ''),
        updated_at: new Date().toISOString(),
      }));

    if (!rows.length) {
      return res.status(400).json({ error: 'No supported Sunwings settings were supplied.' });
    }

    await parseSupabase(
      await supabaseUserRest(
        owner.accessToken,
        'sunwings_site_settings?on_conflict=site_key,key',
        {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(rows),
        },
      ),
      'Unable to save Sunwings site settings.',
    );

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[sunwings] site settings failed', error);
    return res.status(500).json({ error: error.message || 'Site settings request failed.' });
  }
}
