import { requireWebsiteOwner } from '../../_shared/auth.js';
import { allowOnly, readBody } from '../../_shared/http.js';
import { SITE_KEYS } from '../../_shared/siteRegistry.js';
import {
  LOCATION_FIELDS,
  cleanLocation,
  deletePost,
  listPosts,
  savePost,
} from './_lib/content.js';

const SITE_KEY = SITE_KEYS.SUNWINGS;
const TABLE = 'sunwings_locations';

export default async function handler(req, res) {
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;
  if (!allowOnly(req, res, ['GET','POST','DELETE'])) return;

  try {
    if (req.method === 'GET') {
      return res.status(200).json({
        posts: await listPosts(owner.accessToken, {
          siteKey: SITE_KEY,
          table: TABLE,
          fields: LOCATION_FIELDS,
        }),
      });
    }

    if (req.method === 'DELETE') {
      const id = String(req.query?.id || '').trim();
      return res.status(200).json(await deletePost(owner.accessToken, {
        siteKey: SITE_KEY,
        table: TABLE,
        id,
      }));
    }

    const post = await savePost(owner.accessToken, {
      siteKey: SITE_KEY,
      table: TABLE,
      fields: LOCATION_FIELDS,
      body: readBody(req),
      cleaner: cleanLocation,
    });
    return res.status(200).json({ post });
  } catch (error) {
    console.error('[sunwings] location posts failed', error);
    return res.status(500).json({ error: error.message || 'Location post request failed.' });
  }
}
