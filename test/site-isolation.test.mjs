import assert from 'node:assert/strict';
import test from 'node:test';

process.env.SUPABASE_ANON_KEY = 'test-publishable-key';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.WEBSITE_OWNER_EMAIL = 'justindema76@gmail.com';

const ownerUser = {
  id: 'owner',
  email: 'justindema76@gmail.com',
  app_metadata: { provider: 'google', providers: ['google'] },
  identities: [{ provider: 'google' }],
};

function responseRecorder() {
  return {
    statusCode: 200,
    payload: null,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
}

function installFetchRecorder(restPayload = []) {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).endsWith('/auth/v1/user')) {
      return new Response(JSON.stringify(ownerUser), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify(restPayload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  return calls;
}

test('Justin service requests are hard-scoped to JustinDeMatteis', async () => {
  const calls = installFetchRecorder([]);
  const { default: handler } = await import('../api/admin/justindematteis/service-requests.js');
  const res = responseRecorder();

  await handler({ method: 'GET', headers: { authorization: 'Bearer token' } }, res);

  assert.equal(res.statusCode, 200);
  const restCall = calls.find(call => call.url.includes('/rest/v1/service_requests?'));
  assert.ok(restCall, 'service_requests REST call was not made');
  assert.match(restCall.url, /site_key=eq\.justindematteis/);
  assert.doesNotMatch(restCall.url, /justconsignin/);
});

test('Justin hiring contacts are hard-scoped to JustinDeMatteis', async () => {
  const calls = installFetchRecorder([]);
  const { default: handler } = await import('../api/admin/justindematteis/hiring-contacts.js');
  const res = responseRecorder();

  await handler({ method: 'GET', headers: { authorization: 'Bearer token' } }, res);

  assert.equal(res.statusCode, 200);
  const restCall = calls.find(call => call.url.includes('/rest/v1/hiring_contacts?'));
  assert.ok(restCall, 'hiring_contacts REST call was not made');
  assert.match(restCall.url, /site_key=eq\.justindematteis/);
  assert.doesNotMatch(restCall.url, /justconsignin/);
});

test('JustConsignIn demo requests use only the demo request backend', async () => {
  const calls = installFetchRecorder([]);
  const { default: handler } = await import('../api/admin/justconsignin/demo-requests.js');
  const res = responseRecorder();

  await handler({ method: 'GET', headers: { authorization: 'Bearer token' } }, res);

  assert.equal(res.statusCode, 200);
  assert.ok(calls.some(call => call.url.includes('/rest/v1/demo_requests?')));
  assert.ok(!calls.some(call => call.url.includes('/rest/v1/service_requests?')));
  assert.ok(!calls.some(call => call.url.includes('/rest/v1/hiring_contacts?')));
});

test('site listing exposes exactly the three configured websites', async () => {
  installFetchRecorder([]);
  const { default: handler } = await import('../api/admin/sites.js');
  const res = responseRecorder();

  await handler({ method: 'GET', headers: { authorization: 'Bearer token' } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(
    res.payload.sites.map(site => site.site_key).sort(),
    ['justconsignin', 'justindematteis', 'sunwings'],
  );
});

test('Justin page storage queries are hard-scoped to JustinDeMatteis', async () => {
  const calls = installFetchRecorder([]);
  const { default: handler } = await import('../api/admin/justindematteis/pages.js');
  const res = responseRecorder();

  await handler({
    method: 'GET',
    headers: { authorization: 'Bearer token' },
    query: { pageId: 'contact' },
  }, res);

  assert.equal(res.statusCode, 200);
  const pageCalls = calls.filter(call =>
    call.url.includes('/rest/v1/site_page_drafts?')
    || call.url.includes('/rest/v1/site_pages?')
  );
  assert.equal(pageCalls.length, 2);
  for (const call of pageCalls) {
    assert.match(call.url, /site_key=eq\.justindematteis/);
    assert.doesNotMatch(call.url, /site_key=eq\.justconsignin/);
  }
});

test('JustConsignIn page storage queries are hard-scoped to JustConsignIn', async () => {
  const calls = installFetchRecorder([]);
  const { default: handler } = await import('../api/admin/justconsignin/pages.js');
  const res = responseRecorder();

  await handler({
    method: 'GET',
    headers: { authorization: 'Bearer token' },
    query: { pageId: 'home' },
  }, res);

  assert.equal(res.statusCode, 200);
  const pageCalls = calls.filter(call =>
    call.url.includes('/rest/v1/site_page_drafts?')
    || call.url.includes('/rest/v1/site_pages?')
  );
  assert.equal(pageCalls.length, 2);
  for (const call of pageCalls) {
    assert.match(call.url, /site_key=eq\.justconsignin/);
    assert.doesNotMatch(call.url, /site_key=eq\.justindematteis/);
  }
});

test('media prefixes are different for the two sites', async () => {
  const { mediaPrefix } = await import('../api/_shared/siteAssets.js');
  assert.equal(mediaPrefix('justindematteis'), 'justindematteis/');
  assert.equal(mediaPrefix('justconsignin'), 'justconsignin/');
  assert.notEqual(mediaPrefix('justindematteis'), mediaPrefix('justconsignin'));
});


test('Sunwings service posts are hard-scoped to Sunwings', async () => {
  const calls = installFetchRecorder([]);
  const { default: handler } = await import('../api/admin/sunwings/services.js');
  const res = responseRecorder();

  await handler({ method: 'GET', headers: { authorization: 'Bearer token' } }, res);

  assert.equal(res.statusCode, 200);
  const restCall = calls.find(call => call.url.includes('/rest/v1/sunwings_services?'));
  assert.ok(restCall, 'sunwings_services REST call was not made');
  assert.match(restCall.url, /site_key=eq\.sunwings/);
  assert.doesNotMatch(restCall.url, /justindematteis|justconsignin/);
});

test('Sunwings location posts are hard-scoped to Sunwings', async () => {
  const calls = installFetchRecorder([]);
  const { default: handler } = await import('../api/admin/sunwings/locations.js');
  const res = responseRecorder();

  await handler({ method: 'GET', headers: { authorization: 'Bearer token' } }, res);

  assert.equal(res.statusCode, 200);
  const restCall = calls.find(call => call.url.includes('/rest/v1/sunwings_locations?'));
  assert.ok(restCall, 'sunwings_locations REST call was not made');
  assert.match(restCall.url, /site_key=eq\.sunwings/);
  assert.doesNotMatch(restCall.url, /justindematteis|justconsignin/);
});
