import { requireWebsiteOwner } from '../_shared/auth.js';
import { listSites } from '../_shared/siteRegistry.js';

export default async function handler(req, res) {
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  return res.status(200).json({
    sites: listSites().map(site => ({
      site_key: site.key,
      name: site.name,
      admin_label: site.adminLabel,
      domain: site.domain,
      features: site.features,
    })),
  });
}
