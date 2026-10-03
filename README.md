# Justinnovate Website Admin

Clean backend-first rebuild of the admin product for separate managed websites:

- JustinDeMatteis.com
- JustConsignIn.com
- SunwingsTransport.ca

The existing production admin is not switched to this repository. This repo is built and tested independently first.

## Site isolation

Site-specific admin APIs live under explicit server-owned namespaces:

```
api/
  _shared/
  admin/
    justindematteis/
    justconsignin/
    sunwings/
```

There is no generic request-controlled `?site=` switch for site-specific CRUD.

## JustinDeMatteis.com backend

- Service Requests
- Service Request department assignment
- Service Request email history / sending
- Hiring Contacts
- Departments
- Email Settings / notification routing
- Blog
- Work Posts
- AI Posts
- YouTube Videos
- Media library
- Social Links
- Pages / drafts / publishing / versions
- Global Styles
- Header / Footer / Project Request global sections

## JustConsignIn.com backend

- Demo Requests
- Demo Request email history / sending
- Demo scheduling
- Beta Partners
- Email Settings / notification routing
- Blog
- YouTube Videos
- Media library
- Social Links
- Social AI
- Social Automation
- Metricool OAuth / scheduling
- Pages / drafts / publishing / versions
- Global Styles
- Header / Footer global sections
- Outreach remains a static/local admin dataset because the existing feature has no server backend

## SunwingsTransport.ca backend

- Service Posts
- Location Posts
- Quote Requests
- Site / homepage banner settings

Services and Locations follow the same draft/publish posting approach used by the content systems in the other managed sites.

## Shared backend

Shared code is restricted to infrastructure and reusable data primitives:

- Google-owner authentication
- Supabase user-token/RLS access
- validation / HTTP helpers
- site registry
- page/settings data layer
- content post data layer
- social/video/media data layer
- email settings data layer

Metricool code is **not** shared. It lives inside the JustConsignIn namespace.

## Database

The repository contains the applied website-admin migrations under:

```
supabase/migrations/
```

The historical service-role permission restoration migration was intentionally not carried into this rebuild. Ordinary admin CRUD uses the authenticated owner token plus RLS.

## Checks

```bash
npm run check
```

CI validates:

- required backend modules exist
- JavaScript syntax
- registered website count and ownership
- cross-site feature ownership
- no mixed root admin endpoints
- no request-controlled site selection
- no `SUPABASE_SECRET_KEY` dependency in admin JavaScript
- runtime route-isolation tests

See:

- [Backend architecture](docs/ARCHITECTURE.md)
- [Backend audit](docs/BACKEND_AUDIT.md)
