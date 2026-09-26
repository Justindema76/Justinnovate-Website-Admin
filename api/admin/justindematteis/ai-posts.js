import { requireWebsiteOwner } from '../../_shared/auth.js';
import { allowOnly, readBody } from '../../_shared/http.js';
import { WORK_FIELDS, cleanWorkPost, deleteContentPost, listContentPosts, saveContentPost } from '../../_shared/contentPosts.js';
import { SITE_KEYS } from '../../_shared/siteRegistry.js';

const SITE_KEY = SITE_KEYS.JUSTIN;

export default async function handler(req, res) {
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;
  if (!allowOnly(req, res, ['GET','POST','DELETE'])) return;

  try {
    if (req.method === 'GET') {
      const posts = await listContentPosts(owner.accessToken, { siteKey: SITE_KEY, table: 'ai_posts', fields: WORK_FIELDS });
      return res.status(200).json({ posts });
    }
    if (req.method === 'DELETE') {
      const id = String(req.query?.id || '').trim();
      return res.status(200).json(await deleteContentPost(owner.accessToken, { siteKey: SITE_KEY, table: 'ai_posts', id }));
    }

    const body = readBody(req);
    const post = await saveContentPost(owner.accessToken, {
      siteKey: SITE_KEY,
      table: 'ai_posts',
      fields: WORK_FIELDS,
      body,
      cleanPost: input => cleanWorkPost(input, { authorName: 'Justin DeMatteis' }),
    });
    return res.status(200).json({ post });
  } catch (error) {
    console.error('[justindematteis] AI posts failed', error);
    return res.status(500).json({ error: error.message || 'AI post request failed.' });
  }
}
