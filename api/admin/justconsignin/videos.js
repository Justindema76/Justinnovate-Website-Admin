import { requireWebsiteOwner } from '../../_shared/auth.js';
import { allowOnly, readBody } from '../../_shared/http.js';
import { SITE_KEYS } from '../../_shared/siteRegistry.js';
import { deleteVideo, loadVideos, saveVideo } from '../../_shared/siteAssets.js';

const SITE_KEY = SITE_KEYS.JUSTCONSIGNIN;

export default async function handler(req, res) {
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;
  if (!allowOnly(req, res, ['GET','POST','DELETE'])) return;

  try {
    if (req.method === 'GET') return res.status(200).json({ videos: await loadVideos(owner.accessToken, SITE_KEY) });
    if (req.method === 'DELETE') {
      const id = String(req.query?.id || '').trim();
      return res.status(200).json(await deleteVideo(owner.accessToken, SITE_KEY, id));
    }
    const video = await saveVideo(owner.accessToken, SITE_KEY, readBody(req), { playlistName: 'JustConsignIn' });
    return res.status(200).json({ video });
  } catch (error) {
    console.error('[justconsignin] videos failed', error);
    return res.status(500).json({ error: error.message || 'Video request failed.' });
  }
}
