export const SITE_KEYS = Object.freeze({
  JUSTIN: 'justindematteis',
  JUSTCONSIGNIN: 'justconsignin',
});

export const SITES = Object.freeze({
  [SITE_KEYS.JUSTIN]: Object.freeze({
    key: SITE_KEYS.JUSTIN,
    name: 'Justin DeMatteis',
    adminLabel: 'JustinDeMatteis.com',
    domain: 'justindematteis.com',
    features: Object.freeze([
      'service-requests',
      'hiring-contacts',
      'departments',
      'content',
      'website',
      'social',
      'settings',
    ]),
  }),
  [SITE_KEYS.JUSTCONSIGNIN]: Object.freeze({
    key: SITE_KEYS.JUSTCONSIGNIN,
    name: 'JustConsignIn',
    adminLabel: 'JustConsignIn.com',
    domain: 'justconsignin.com',
    features: Object.freeze([
      'demo-requests',
      'beta-partners',
      'outreach',
      'content',
      'website',
      'social',
      'settings',
    ]),
  }),
});

export function getSite(siteKey) {
  return SITES[String(siteKey || '').trim().toLowerCase()] || null;
}

export function requireSite(siteKey) {
  const site = getSite(siteKey);
  if (!site) throw new Error(`Unknown site: ${siteKey}`);
  return site;
}

export function listSites() {
  return Object.values(SITES);
}
