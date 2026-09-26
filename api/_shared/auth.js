import { getUserFromToken } from './supabase.js';

export const WEBSITE_OWNER_EMAIL = String(
  process.env.WEBSITE_OWNER_EMAIL || 'justindema76@gmail.com',
).trim().toLowerCase();

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function identityProviders(user) {
  const providers = new Set();
  const primary = String(user?.app_metadata?.provider || '').trim().toLowerCase();
  if (primary) providers.add(primary);

  for (const provider of user?.app_metadata?.providers || []) {
    const value = String(provider || '').trim().toLowerCase();
    if (value) providers.add(value);
  }

  for (const identity of user?.identities || []) {
    const value = String(identity?.provider || '').trim().toLowerCase();
    if (value) providers.add(value);
  }

  return providers;
}

export function isWebsiteOwner(user) {
  return normalizeEmail(user?.email) === WEBSITE_OWNER_EMAIL
    && identityProviders(user).has('google');
}

export async function requireWebsiteOwner(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const authorization = String(req.headers.authorization || '');
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const user = await getUserFromToken(token);

  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  if (!isWebsiteOwner(user)) {
    res.status(404).json({ error: 'Not found' });
    return null;
  }

  return { ...user, accessToken: token };
}
