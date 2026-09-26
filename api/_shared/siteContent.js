import { parseSupabase } from './http.js';
import { supabaseUserRest } from './supabase.js';

function siteFilter(siteKey) {
  return `site_key=eq.${encodeURIComponent(siteKey)}`;
}

export async function loadPage(accessToken, siteKey, pageId) {
  const [draftResponse, publishedResponse] = await Promise.all([
    supabaseUserRest(
      accessToken,
      `site_page_drafts?${siteFilter(siteKey)}&page_id=eq.${encodeURIComponent(pageId)}&select=site_key,page_id,path,title,content,updated_at&limit=1`,
      { method: 'GET' },
    ),
    supabaseUserRest(
      accessToken,
      `site_pages?${siteFilter(siteKey)}&page_id=eq.${encodeURIComponent(pageId)}&select=site_key,page_id,path,title,content,published_at,updated_at&limit=1`,
      { method: 'GET' },
    ),
  ]);

  const draft = await parseSupabase(draftResponse, 'Unable to load page draft.');
  const published = await parseSupabase(publishedResponse, 'Unable to load published page.');

  return {
    draft: Array.isArray(draft) ? draft[0] || null : null,
    published: Array.isArray(published) ? published[0] || null : null,
  };
}

export async function savePage(accessToken, siteKey, input) {
  const pageId = String(input.pageId || '').trim();
  const path = String(input.path || '/').trim() || '/';
  const title = String(input.title || '').trim();
  const action = input.action === 'publish' ? 'publish' : 'draft';
  const content = input.content;

  if (!pageId) throw new Error('Missing page id.');
  if (!title) throw new Error('Missing page title.');
  if (!content || typeof content !== 'object' || !Array.isArray(content.content)) {
    throw new Error('Invalid page content.');
  }

  const now = new Date().toISOString();
  const draftRows = await parseSupabase(
    await supabaseUserRest(accessToken, 'site_page_drafts?on_conflict=site_key,page_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({
        site_key: siteKey,
        page_id: pageId,
        path,
        title,
        content,
        updated_at: now,
      }),
    }),
    'Unable to save page draft.',
  );

  let published = null;
  if (action === 'publish') {
    const publishedRows = await parseSupabase(
      await supabaseUserRest(accessToken, 'site_pages?on_conflict=site_key,page_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({
          site_key: siteKey,
          page_id: pageId,
          path,
          title,
          content,
          published_at: now,
          updated_at: now,
        }),
      }),
      'Unable to publish page.',
    );
    published = Array.isArray(publishedRows) ? publishedRows[0] || null : publishedRows;

    const versionResponse = await supabaseUserRest(accessToken, 'site_page_versions', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        site_key: siteKey,
        page_id: pageId,
        path,
        title,
        content,
        published_at: now,
      }),
    });
    if (!versionResponse.ok) {
      console.error(`[${siteKey}] unable to save page version`, await versionResponse.text().catch(() => ''));
    }
  }

  return {
    draft: Array.isArray(draftRows) ? draftRows[0] || null : draftRows,
    published,
  };
}

export async function loadGlobalStyles(accessToken, siteKey) {
  const rows = await parseSupabase(
    await supabaseUserRest(
      accessToken,
      `site_settings?${siteFilter(siteKey)}&key=eq.global_styles&select=site_key,key,value,updated_at&limit=1`,
      { method: 'GET' },
    ),
    'Unable to load global styles.',
  );
  return { value: rows?.[0]?.value || null, updatedAt: rows?.[0]?.updated_at || '' };
}

export async function saveGlobalStyles(accessToken, siteKey, value) {
  if (!value || typeof value !== 'object') throw new Error('Invalid global styles value.');
  const rows = await parseSupabase(
    await supabaseUserRest(accessToken, 'site_settings?on_conflict=site_key,key', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({
        site_key: siteKey,
        key: 'global_styles',
        value,
        updated_at: new Date().toISOString(),
      }),
    }),
    'Unable to save global styles.',
  );
  return { value: rows?.[0]?.value || value, updatedAt: rows?.[0]?.updated_at || '' };
}

export async function loadGlobalSection(accessToken, siteKey, key, allowedKeys) {
  if (!allowedKeys.includes(key)) throw new Error('Invalid global section.');
  const rows = await parseSupabase(
    await supabaseUserRest(
      accessToken,
      `site_settings?${siteFilter(siteKey)}&key=eq.${encodeURIComponent(`global_${key}`)}&select=site_key,key,value,updated_at&limit=1`,
      { method: 'GET' },
    ),
    'Unable to load global website section.',
  );
  return { value: rows?.[0]?.value || null, updatedAt: rows?.[0]?.updated_at || '' };
}

export async function saveGlobalSection(accessToken, siteKey, key, value, allowedKeys) {
  if (!allowedKeys.includes(key)) throw new Error('Invalid global section.');
  if (!value || typeof value !== 'object') throw new Error('Invalid global section value.');

  const rows = await parseSupabase(
    await supabaseUserRest(accessToken, 'site_settings?on_conflict=site_key,key', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({
        site_key: siteKey,
        key: `global_${key}`,
        value,
        updated_at: new Date().toISOString(),
      }),
    }),
    'Unable to save global website section.',
  );

  return { value: rows?.[0]?.value || value, updatedAt: rows?.[0]?.updated_at || '' };
}
