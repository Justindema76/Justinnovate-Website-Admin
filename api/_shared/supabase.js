const DEFAULT_SUPABASE_URL = 'https://nowsajdmbpxvlvrhopjg.supabase.co';

export function supabaseUrl() {
  return process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
}

export function supabaseAnonKey() {
  const value = process.env.SUPABASE_ANON_KEY;
  if (!value) throw new Error('SUPABASE_ANON_KEY is not configured');
  return value;
}

export async function getUserFromToken(token) {
  if (!token) return null;
  const response = await fetch(`${supabaseUrl()}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey(),
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) return null;
  return response.json();
}

export async function supabaseUserRest(token, path, options = {}) {
  return fetch(`${supabaseUrl()}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: supabaseAnonKey(),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

export async function supabaseUserStorage(token, path, options = {}) {
  return fetch(`${supabaseUrl()}/storage/v1/${path}`, {
    ...options,
    headers: {
      apikey: supabaseAnonKey(),
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}
