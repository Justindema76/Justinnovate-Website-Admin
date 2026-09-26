import { requireWebsiteOwner } from '../../_shared/auth.js';
import { allowOnly, readBody } from '../../_shared/http.js';
import { SITE_KEYS } from '../../_shared/siteRegistry.js';
import { loadPage, savePage } from '../../_shared/siteContent.js';

const SITE_KEY = SITE_KEYS.JUSTCONSIGNIN;

export default async function handler(req, res) {
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;
  if (!allowOnly(req, res, ['GET','POST'])) return;

  try {
    if (req.method === 'GET') {
      const pageId = String(req.query?.pageId || '').trim();
      if (!pageId) return res.status(400).json({ error: 'Missing page id.' });
      return res.status(200).json(await loadPage(owner.accessToken, SITE_KEY, pageId));
    }
    return res.status(200).json(await savePage(owner.accessToken, SITE_KEY, readBody(req)));
  } catch (error) {
    console.error('[justconsignin] pages failed', error);
    return res.status(500).json({ error: error.message || 'Website page request failed.' });
  }
}
