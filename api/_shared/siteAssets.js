import { parseSupabase } from './http.js';
import { supabaseUrl, supabaseUserRest, supabaseUserStorage } from './supabase.js';

const SOCIAL_KEYS = ['facebook','instagram','linkedin','github','youtube','tiktok'];
const MEDIA_BUCKETS = [
  { bucket: 'site-assets', mediaType: 'image', protectedAsset: true },
  { bucket: 'work-media', mediaType: 'work', protectedAsset: false },
  { bucket: 'blog-images', mediaType: 'image', protectedAsset: false },
  { bucket: 'social-videos', mediaType: 'video', protectedAsset: false },
  { bucket: 'social-audio', mediaType: 'audio', protectedAsset: false },
];

function siteFilter(siteKey) {
  return `site_key=eq.${encodeURIComponent(siteKey)}`;
}

export function normalizeSocialLinks(input = {}) {
  const source = input.social || input.value || input;
  return Object.fromEntries(SOCIAL_KEYS.map(key => [key, {
    url: String(source?.[key]?.url || '').trim(),
    enabled: source?.[key]?.enabled !== false,
  }]));
}

export async function loadSocialLinks(accessToken, siteKey) {
  const rows = await parseSupabase(
    await supabaseUserRest(
      accessToken,
      `site_settings?${siteFilter(siteKey)}&key=eq.social_links&select=site_key,key,value,updated_at&limit=1`,
      { method: 'GET' },
    ),
    'Unable to load social links.',
  );
  return normalizeSocialLinks(rows?.[0]?.value || {});
}

export async function saveSocialLinks(accessToken, siteKey, value) {
  const social = normalizeSocialLinks(value);
  const rows = await parseSupabase(
    await supabaseUserRest(accessToken, 'site_settings?on_conflict=site_key,key', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({
        site_key: siteKey,
        key: 'social_links',
        value: social,
        updated_at: new Date().toISOString(),
      }),
    }),
    'Unable to save social links.',
  );
  return normalizeSocialLinks(rows?.[0]?.value || social);
}

function youtubeId(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    if (url.hostname.includes('youtu.be')) return url.pathname.split('/').filter(Boolean)[0] || '';
    const v = url.searchParams.get('v');
    if (v) return v;
    const parts = url.pathname.split('/').filter(Boolean);
    const marker = parts.findIndex(part => ['embed','shorts','live'].includes(part));
    if (marker >= 0 && parts[marker + 1]) return parts[marker + 1];
  } catch {}
  return /^[A-Za-z0-9_-]{6,}$/.test(raw) ? raw : '';
}

function youtubeContentType(value = '', requested = '') {
  const explicit = String(requested || '').trim().toLowerCase();
  if (explicit === 'short') return 'short';
  if (explicit === 'video') return 'video';
  return /youtube\.com\/shorts\//i.test(String(value || '')) ? 'short' : 'video';
}

export function cleanVideo(body = {}, defaults = {}) {
  const url = String(body.youtubeUrl || body.youtube_url || '').trim();
  return {
    title: String(body.title || '').trim(),
    youtube_url: url,
    youtube_id: youtubeId(url),
    description: String(body.description || ''),
    placement: String(body.placement || 'homepage').trim().toLowerCase() || 'homepage',
    sort_order: Number.isFinite(Number(body.sortOrder ?? body.sort_order))
      ? Number(body.sortOrder ?? body.sort_order)
      : 0,
    status: body.status === 'hidden' ? 'hidden' : 'active',
    content_type: youtubeContentType(url, body.contentType ?? body.content_type),
    playlist_name: String(body.playlistName ?? body.playlist_name ?? defaults.playlistName ?? '').trim().slice(0, 160),
    updated_at: new Date().toISOString(),
  };
}

export async function loadVideos(accessToken, siteKey) {
  return parseSupabase(
    await supabaseUserRest(
      accessToken,
      `site_videos?${siteFilter(siteKey)}&select=*&order=placement.asc,playlist_name.asc,content_type.asc,sort_order.asc,created_at.asc`,
      { method: 'GET' },
    ),
    'Unable to load videos.',
  );
}

export async function saveVideo(accessToken, siteKey, body, defaults = {}) {
  const payload = cleanVideo(body, defaults);
  if (!payload.title) throw new Error('Video title is required.');
  if (!payload.youtube_url || !payload.youtube_id) throw new Error('Enter a valid YouTube URL.');

  const id = String(body.id || '').trim();
  const path = id
    ? `site_videos?${siteFilter(siteKey)}&id=eq.${encodeURIComponent(id)}`
    : 'site_videos';

  const rows = await parseSupabase(
    await supabaseUserRest(accessToken, path, {
      method: id ? 'PATCH' : 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ ...payload, site_key: siteKey }),
    }),
    'Unable to save video.',
  );

  return Array.isArray(rows) ? rows[0] || null : rows;
}

export async function deleteVideo(accessToken, siteKey, id) {
  if (!id) throw new Error('Missing video id.');
  await parseSupabase(
    await supabaseUserRest(
      accessToken,
      `site_videos?${siteFilter(siteKey)}&id=eq.${encodeURIComponent(id)}`,
      { method: 'DELETE', headers: { Prefer: 'return=minimal' } },
    ),
    'Unable to delete video.',
  );
  return { ok: true };
}

function publicMediaUrl(bucket, name) {
  const encoded = String(name || '').split('/').map(encodeURIComponent).join('/');
  return `${supabaseUrl()}/storage/v1/object/public/${bucket}/${encoded}`;
}

export function mediaPrefix(siteKey) {
  return `${siteKey}/`;
}

async function listBucket(accessToken, siteKey, config) {
  const prefix = mediaPrefix(siteKey);
  const response = await supabaseUserStorage(accessToken, `object/list/${config.bucket}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prefix,
      limit: 500,
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' },
    }),
  });
  const data = await response.json().catch(() => []);
  if (!response.ok) throw new Error(data?.message || data?.error || `Unable to load ${config.mediaType} media.`);

  return (Array.isArray(data) ? data : [])
    .filter(item => item?.name && item.name !== '.emptyFolderPlaceholder')
    .map(item => {
      const path = `${prefix}${item.name}`;
      return {
        name: item.name,
        path,
        bucket: config.bucket,
        mediaType: config.mediaType,
        url: publicMediaUrl(config.bucket, path),
        createdAt: item.created_at || item.updated_at || '',
        updatedAt: item.updated_at || '',
        metadata: item.metadata || {},
        protectedAsset: Boolean(config.protectedAsset),
      };
    });
}

export async function loadMedia(accessToken, siteKey) {
  const groups = await Promise.all(MEDIA_BUCKETS.map(config => listBucket(accessToken, siteKey, config)));
  return groups.flat().sort((a, b) => {
    const left = new Date(a.createdAt || 0).getTime() || 0;
    const right = new Date(b.createdAt || 0).getTime() || 0;
    return right - left;
  });
}

export async function deleteMedia(accessToken, siteKey, bucket, objectPath) {
  const config = MEDIA_BUCKETS.find(item => item.bucket === bucket);
  if (!config) throw new Error('Invalid media bucket.');
  if (config.protectedAsset) {
    const error = new Error('Website page assets are protected. Replace the image on the page instead of deleting the stored asset.');
    error.statusCode = 409;
    throw error;
  }

  const path = String(objectPath || '').trim();
  const prefix = mediaPrefix(siteKey);
  if (!path || path.includes('..') || !path.startsWith(prefix)) {
    throw new Error('Invalid media path.');
  }

  const encoded = path.split('/').map(encodeURIComponent).join('/');
  const response = await supabaseUserStorage(
    accessToken,
    `object/${encodeURIComponent(bucket)}/${encoded}`,
    { method: 'DELETE' },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || data?.error || 'Unable to delete media.');

  return { ok: true, bucket, path };
}

export function allowedMediaBuckets() {
  return MEDIA_BUCKETS.map(item => ({ ...item }));
}
