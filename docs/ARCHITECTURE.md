# Justinnovate Website Admin — Backend Architecture

## Rule

One admin product supports **two separate websites**. Site ownership is explicit in the server route. Shared code contains infrastructure only.

## Namespaces

### JustinDeMatteis.com

`/api/admin/justindematteis/*`

Owns:

- project / quote intake workflow
- Service Requests
- Service Request email history
- department assignment
- Departments
- Hiring Contacts / recruitment
- Justin-specific content: Work Posts and AI Posts
- Justin website pages/settings/global sections
- Justin email routing
- Justin videos/media/social links

### JustConsignIn.com

`/api/admin/justconsignin/*`

Owns:

- Demo Requests
- Demo scheduling
- Demo email history
- Beta Partners
- JustConsignIn social automation
- Social AI
- Metricool
- JustConsignIn website pages/settings/global sections
- JustConsignIn email routing
- JustConsignIn videos/media/social links

The current Outreach Map is intentionally classified as `outreach-static`: the existing feature is hard-coded plus browser local storage and has no server-side data source to migrate.

## Shared backend

`/api/_shared/*` may contain only reusable infrastructure:

- `auth.js`
- `supabase.js`
- `http.js`
- `siteRegistry.js`
- `siteContent.js`
- `siteAssets.js`
- `contentPosts.js`
- `emailSettings.js`

Business-specific integrations must live inside the owning website namespace. Metricool therefore lives under:

`/api/admin/justconsignin/_lib/*`

## Site isolation

The browser never decides website ownership with a request value such as:

`?site=justindematteis`

Instead, the route owns the site:

- `/api/admin/justindematteis/service-requests`
- `/api/admin/justconsignin/demo-requests`

Every site-scoped database query additionally filters by the server-owned site key when the underlying table has `site_key`.

## Authentication and Supabase

Admin routes require the configured owner Google identity.

Ordinary admin CRUD uses:

- authenticated owner JWT
- Supabase publishable/anon key
- database RLS

The new admin JavaScript does not use `SUPABASE_SECRET_KEY`.

Email delivery that legitimately requires privileged server execution remains inside the existing Supabase Edge Function. The source is versioned in this repository under:

`supabase/functions/send-site-email/index.ts`

## Email routing

Email settings are separated by website.

JustinDeMatteis.com validates that enabled **To** routes exist for:

- Service Requests
- Hiring Contacts

JustConsignIn validates an enabled **To** route for:

- Demo Requests

## Media

New media is designed to use site-owned storage prefixes:

- `justindematteis/...`
- `justconsignin/...`

The media API only lists/deletes paths inside its own prefix. Existing legacy URLs remain valid and are not rewritten automatically.

Large uploads should continue going directly from the authenticated admin client to Supabase Storage rather than being proxied through a Vercel serverless request.

## Database migrations

Historical structural migrations needed by the new backend are versioned in `supabase/migrations`.

The old migration that restored broad service-role permissions is deliberately excluded because this architecture does not use a service-role secret for normal admin CRUD.

## Automated guardrails

`npm run check` runs:

1. architecture validation
2. required-file validation
3. cross-site reference validation
4. no mixed root admin endpoints
5. no request-controlled site selection
6. no service-role secret dependency
7. JavaScript syntax checks
8. Node runtime tests

GitHub Actions runs the same checks on every push and pull request.

## Release rule

Do not switch the production Website Admin to this repository until:

1. backend checks pass;
2. a separate test deployment is created;
3. the admin frontend is built against these new routes;
4. Justin reviews the code and tests both website contexts;
5. the production switch is explicitly approved.
