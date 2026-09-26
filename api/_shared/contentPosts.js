import { parseSupabase } from './http.js';
import { supabaseUserRest } from './supabase.js';

export const BLOG_FIELDS = 'site_key,id,slug,title,excerpt,seo_title,seo_description,category,tags,featured_image,body,status,author_name,published_at,created_at,updated_at';

export const WORK_FIELDS = [
  'site_key','id','slug','title','work_type','company','role','platform','audience',
  'excerpt','featured_image','featured_image_alt','project_url','secondary_url','tags',
  'sections','body_html','seo_title','seo_description','og_image','status','author_name',
  'published_at','created_at','updated_at',
].join(',');

export function cleanBlogPost(body = {}, defaults = {}) {
  const status = body.status === 'published' ? 'published' : 'draft';
  return {
    slug: String(body.slug || '').trim(),
    title: String(body.title || '').trim(),
    excerpt: String(body.excerpt || ''),
    seo_title: String(body.seoTitle || body.seo_title || ''),
    seo_description: String(body.seoDescription || body.seo_description || ''),
    category: String(body.category || defaults.category || ''),
    tags: Array.isArray(body.tags) ? body.tags.map(v => String(v).trim()).filter(Boolean) : [],
    featured_image: String(body.featuredImage || body.featured_image || ''),
    body: String(body.body || ''),
    status,
    author_name: String(body.authorName || body.author_name || defaults.authorName || '').trim(),
    published_at: status === 'published'
      ? (body.publishedAt || body.published_at || new Date().toISOString())
      : null,
    updated_at: new Date().toISOString(),
  };
}

export function cleanWorkPost(body = {}, defaults = {}) {
  const status = body.status === 'published' ? 'published' : 'draft';
  return {
    slug: String(body.slug || '').trim(),
    title: String(body.title || '').trim(),
    work_type: String(body.workType ?? body.work_type ?? '').trim(),
    company: String(body.company || '').trim(),
    role: String(body.role || '').trim(),
    platform: String(body.platform || '').trim(),
    audience: String(body.audience || '').trim(),
    excerpt: String(body.excerpt || ''),
    featured_image: String(body.featuredImage ?? body.featured_image ?? ''),
    featured_image_alt: String(body.featuredImageAlt ?? body.featured_image_alt ?? ''),
    project_url: String(body.projectUrl ?? body.project_url ?? ''),
    secondary_url: String(body.secondaryUrl ?? body.secondary_url ?? ''),
    tags: Array.isArray(body.tags) ? body.tags.map(value => String(value).trim()).filter(Boolean) : [],
    sections: body.sections && typeof body.sections === 'object' && !Array.isArray(body.sections)
      ? body.sections
      : {},
    body_html: String(body.bodyHtml ?? body.body_html ?? ''),
    seo_title: String(body.seoTitle ?? body.seo_title ?? ''),
    seo_description: String(body.seoDescription ?? body.seo_description ?? ''),
    og_image: String(body.ogImage ?? body.og_image ?? ''),
    status,
    author_name: String(body.authorName ?? body.author_name ?? defaults.authorName ?? '').trim(),
    published_at: status === 'published'
      ? (body.publishedAt ?? body.published_at ?? new Date().toISOString())
      : null,
    updated_at: new Date().toISOString(),
  };
}

export async function listContentPosts(accessToken, { siteKey, table, fields }) {
  return parseSupabase(
    await supabaseUserRest(
      accessToken,
      `${table}?site_key=eq.${encodeURIComponent(siteKey)}&select=${encodeURIComponent(fields)}&order=updated_at.desc`,
      { method: 'GET' },
    ),
    `Unable to load ${table}.`,
  );
}

export async function saveContentPost(accessToken, {
  siteKey,
  table,
  fields,
  body,
  cleanPost,
}) {
  const payload = { ...cleanPost(body), site_key: siteKey };
  if (!payload.title) throw new Error('Title is required.');
  if (!payload.slug) throw new Error('Slug is required.');

  const id = String(body?.id || '').trim();
  const path = id
    ? `${table}?site_key=eq.${encodeURIComponent(siteKey)}&id=eq.${encodeURIComponent(id)}&select=${encodeURIComponent(fields)}`
    : `${table}?select=${encodeURIComponent(fields)}`;

  const rows = await parseSupabase(
    await supabaseUserRest(accessToken, path, {
      method: id ? 'PATCH' : 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    }),
    `Unable to save ${table}.`,
  );

  return Array.isArray(rows) ? rows[0] || null : rows;
}

export async function deleteContentPost(accessToken, { siteKey, table, id }) {
  if (!id) throw new Error('Missing content id.');
  await parseSupabase(
    await supabaseUserRest(
      accessToken,
      `${table}?site_key=eq.${encodeURIComponent(siteKey)}&id=eq.${encodeURIComponent(id)}`,
      { method: 'DELETE', headers: { Prefer: 'return=minimal' } },
    ),
    `Unable to delete ${table}.`,
  );
  return { ok: true };
}
