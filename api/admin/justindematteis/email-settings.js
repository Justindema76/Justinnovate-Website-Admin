import { requireWebsiteOwner } from '../../_shared/auth.js';
import { allowOnly, readBody } from '../../_shared/http.js';
import { loadEmailSettings, saveEmailSettings, testEmailSettings } from '../../_shared/emailSettings.js';
import { SITE_KEYS } from '../../_shared/siteRegistry.js';

const CONFIG = {
  siteKey: SITE_KEYS.JUSTIN,
  requiredRoutes: [
    { eventKey: 'service_request', label: 'Service Requests', fallbackRouteId: 'service-primary' },
    { eventKey: 'hiring_contact', label: 'Hiring Contacts', fallbackRouteId: 'hiring-primary' },
  ],
  defaultFromName: 'Justin DeMatteis',
};

export default async function handler(req, res) {
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;
  if (!allowOnly(req, res, ['GET','PUT','POST'])) return;

  try {
    if (req.method === 'GET') return res.status(200).json(await loadEmailSettings(owner.accessToken, CONFIG));
    if (req.method === 'PUT') return res.status(200).json(await saveEmailSettings(owner.accessToken, CONFIG, readBody(req)));

    const body = readBody(req);
    if (body.action !== 'test') return res.status(400).json({ error: 'Invalid action.' });
    return res.status(200).json(await testEmailSettings(owner.accessToken, CONFIG));
  } catch (error) {
    console.error('[justindematteis] email settings failed', error);
    const status = req.method === 'POST' ? 502 : 500;
    return res.status(status).json({ error: error.message || 'Email settings request failed.' });
  }
}
