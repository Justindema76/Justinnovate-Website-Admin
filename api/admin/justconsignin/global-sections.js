import { requireWebsiteOwner } from '../../_shared/auth.js';
import { allowOnly, readBody } from '../../_shared/http.js';
import { SITE_KEYS } from '../../_shared/siteRegistry.js';
import { loadGlobalSection, saveGlobalSection } from '../../_shared/siteContent.js';

const SITE_KEY = SITE_KEYS.JUSTCONSIGNIN;
const ALLOWED = ['header','footer'];

export default async function handler(req, res) {
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;
  if (!allowOnly(req, res, ['GET','POST'])) return;

  try {
    if (req.method === 'GET') {
      const key = String(req.query?.key || '').trim().toLowerCase();
      return res.status(200).json(await loadGlobalSection(owner.accessToken, SITE_KEY, key, ALLOWED));
    }
    const body = readBody(req);
    const key = String(body.key || '').trim().toLowerCase();
    return res.status(200).json(await saveGlobalSection(owner.accessToken, SITE_KEY, key, body.value, ALLOWED));
  } catch (error) {
    console.error('[justconsignin] global section failed', error);
    return res.status(500).json({ error: error.message || 'Global section request failed.' });
  }
}
