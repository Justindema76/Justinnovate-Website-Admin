import { requireWebsiteOwner } from '../../_shared/auth.js';
import { allowOnly } from '../../_shared/http.js';
import { SITE_KEYS } from '../../_shared/siteRegistry.js';
import { deleteMedia, loadMedia } from '../../_shared/siteAssets.js';

const SITE_KEY = SITE_KEYS.JUSTIN;

export default async function handler(req, res) {
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;
  if (!allowOnly(req, res, ['GET','DELETE'])) return;

  try {
    if (req.method === 'GET') return res.status(200).json({ media: await loadMedia(owner.accessToken, SITE_KEY) });
    const bucket = String(req.query?.bucket || '').trim();
    const path = String(req.query?.path || '').trim();
    return res.status(200).json(await deleteMedia(owner.accessToken, SITE_KEY, bucket, path));
  } catch (error) {
    console.error('[justindematteis] media failed', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Media request failed.' });
  }
}
