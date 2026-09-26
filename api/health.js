import { listSites } from './_shared/siteRegistry.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  return res.status(200).json({
    ok: true,
    service: 'Justinnovate Website Admin Backend',
    architecture: 'two-site-isolated',
    sites: listSites().map(site => ({
      key: site.key,
      domain: site.domain,
      features: site.features,
    })),
  });
}
