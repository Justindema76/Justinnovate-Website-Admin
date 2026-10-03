import { requireWebsiteOwner } from '../../_shared/auth.js';
import { allowOnly, readBody } from '../../_shared/http.js';
import { SITE_KEYS } from '../../_shared/siteRegistry.js';
import {
  SERVICE_FIELDS,
  cleanService,
  deletePost,
  listPosts,
  savePost,
} from './_lib/content.js';

const SITE_KEY = SITE_KEYS.SUNWINGS;
const TABLE = 'sunwings_services';

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
          fields: SERVICE_FIELDS,
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
      fields: SERVICE_FIELDS,
      body: readBody(req),
      cleaner: cleanService,
    });
    return res.status(200).json({ post });
  } catch (error) {
    console.error('[sunwings] service posts failed', error);
    return res.status(500).json({ error: error.message || 'Service post request failed.' });
  }
}
