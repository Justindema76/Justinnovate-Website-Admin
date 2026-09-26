import { requireWebsiteOwner } from '../../_shared/auth.js';
import { allowOnly, readBody } from '../../_shared/http.js';
import { BLOG_FIELDS, cleanBlogPost, deleteContentPost, listContentPosts, saveContentPost } from '../../_shared/contentPosts.js';
import { SITE_KEYS } from '../../_shared/siteRegistry.js';

const SITE_KEY = SITE_KEYS.JUSTCONSIGNIN;

export default async function handler(req, res) {
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;
  if (!allowOnly(req, res, ['GET','POST','DELETE'])) return;

  try {
    if (req.method === 'GET') {
      const posts = await listContentPosts(owner.accessToken, { siteKey: SITE_KEY, table: 'blog_posts', fields: BLOG_FIELDS });
      return res.status(200).json({ posts });
    }

    if (req.method === 'DELETE') {
      const id = String(req.query?.id || '').trim();
      return res.status(200).json(await deleteContentPost(owner.accessToken, { siteKey: SITE_KEY, table: 'blog_posts', id }));
    }

    const body = readBody(req);
    const post = await saveContentPost(owner.accessToken, {
      siteKey: SITE_KEY,
      table: 'blog_posts',
      fields: BLOG_FIELDS,
      body,
      cleanPost: input => cleanBlogPost(input, { category: 'Shopify Consignment', authorName: 'JustConsignIn' }),
    });
    return res.status(200).json({ post });
  } catch (error) {
    console.error('[justconsignin] blog failed', error);
    return res.status(500).json({ error: error.message || 'Blog request failed.' });
  }
}
