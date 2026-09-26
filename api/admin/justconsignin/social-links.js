import { requireWebsiteOwner } from '../../_shared/auth.js';
import { allowOnly, readBody } from '../../_shared/http.js';
import { SITE_KEYS } from '../../_shared/siteRegistry.js';
import { loadSocialLinks, saveSocialLinks } from '../../_shared/siteAssets.js';

const SITE_KEY = SITE_KEYS.JUSTCONSIGNIN;

export default async function handler(req, res) {
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;
  if (!allowOnly(req, res, ['GET','POST'])) return;

  try {
    if (req.method === 'GET') {
      return res.status(200).json({ social: await loadSocialLinks(owner.accessToken, SITE_KEY) });
    }
    return res.status(200).json({ social: await saveSocialLinks(owner.accessToken, SITE_KEY, readBody(req)) });
  } catch (error) {
    console.error('[justconsignin] social links failed', error);
    return res.status(500).json({ error: error.message || 'Social links request failed.' });
  }
}
