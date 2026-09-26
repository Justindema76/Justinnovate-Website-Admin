import { clean, parseSupabase } from './http.js';
import { supabaseAnonKey, supabaseUrl, supabaseUserRest } from './supabase.js';

const ROUTE_TYPES = new Set(['to','cc','bcc']);
const EVENT_KEY = /^[a-z0-9_-]{1,60}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requiredRoutes(config) {
  if (Array.isArray(config.requiredRoutes) && config.requiredRoutes.length) return config.requiredRoutes;
  return [{
    eventKey: config.requiredEvent,
    label: config.requiredLabel,
    fallbackRouteId: config.fallbackRouteId,
  }];
}

function normalizeRoutes(value, fallbackEmail, config) {
  const source = Array.isArray(value) ? value : [];
  const required = requiredRoutes(config);
  const routes = source
    .slice(0, 50)
    .filter(route => clean(route?.email, 320))
    .map((route, index) => {
      const eventKey = clean(route?.eventKey, 60).toLowerCase();
      const recipientType = clean(route?.recipientType, 10).toLowerCase();
      const email = clean(route?.email, 320).toLowerCase();

      if (!EVENT_KEY.test(eventKey) || !ROUTE_TYPES.has(recipientType) || !EMAIL.test(email)) {
        throw new Error(`Invalid notification route ${index + 1}.`);
      }

      return {
        id: clean(route?.id, 100) || `route-${index + 1}`,
        eventKey,
        recipientType,
        email,
        enabled: route?.enabled !== false,
      };
    });

  const fallback = clean(fallbackEmail, 320).toLowerCase();
  if (!routes.length && EMAIL.test(fallback)) {
    for (const requirement of required) {
      routes.push({
        id: requirement.fallbackRouteId || `${requirement.eventKey}-primary`,
        eventKey: requirement.eventKey,
        recipientType: 'to',
        email: fallback,
        enabled: true,
      });
    }
  }

  for (const requirement of required) {
    const hasRequiredTo = routes.some(route =>
      route.enabled
      && route.eventKey === requirement.eventKey
      && route.recipientType === 'to'
      && route.email
    );

    if (!hasRequiredTo) {
      throw new Error(`Add at least one enabled ${requirement.label} recipient using To.`);
    }
  }

  return routes;
}

async function callOwnerRpc(accessToken, name, body = {}) {
  return parseSupabase(
    await supabaseUserRest(accessToken, `rpc/${name}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    'Unable to update email settings.',
  );
}

export async function loadEmailSettings(accessToken, config) {
  const rows = await callOwnerRpc(accessToken, 'admin_get_email_settings', {
    p_site_key: config.siteKey,
  });

  return {
    siteKey: config.siteKey,
    settings: Array.isArray(rows) ? rows[0] || null : rows || null,
  };
}

export async function saveEmailSettings(accessToken, config, body) {
  const port = Number(body.smtpPort);
  const smtpHost = clean(body.smtpHost, 255);
  const smtpUsername = clean(body.smtpUsername, 320);
  const fromEmail = clean(body.fromEmail, 320).toLowerCase();

  if (!smtpHost || !smtpUsername || !fromEmail) {
    throw new Error('SMTP host, username and From email are required.');
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Enter a valid SMTP port.');
  }
  if (!EMAIL.test(fromEmail)) throw new Error('Enter a valid From email address.');

  const routes = normalizeRoutes(body.notificationRoutes, body.notificationEmail, config);
  const primaryRequirement = requiredRoutes(config)[0];
  const primaryEmail = routes.find(route =>
    route.enabled
    && route.eventKey === primaryRequirement.eventKey
    && route.recipientType === 'to'
  )?.email || '';

  const rows = await callOwnerRpc(accessToken, 'admin_save_email_settings', {
    p_enabled: body.enabled !== false,
    p_provider: 'smtp',
    p_smtp_host: smtpHost,
    p_smtp_port: port,
    p_smtp_secure: body.smtpSecure !== false,
    p_smtp_username: smtpUsername,
    p_smtp_from_email: fromEmail,
    p_smtp_from_name: clean(body.fromName, 160) || config.defaultFromName,
    p_notification_email: primaryEmail,
    p_password: clean(body.password, 1000) || null,
    p_notification_routes: routes,
    p_site_key: config.siteKey,
  });

  return {
    siteKey: config.siteKey,
    settings: Array.isArray(rows) ? rows[0] || null : rows || null,
  };
}

export async function testEmailSettings(accessToken, config) {
  const response = await fetch(`${supabaseUrl()}/functions/v1/send-site-email`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey(),
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'test', siteKey: config.siteKey }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'Test email failed.');
  return { ok: true, message: 'Test email sent.' };
}
