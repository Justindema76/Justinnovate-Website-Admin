# Backend Audit

This file accounts for the backend responsibilities in the existing Website Admin and shows where they live in the clean rebuild.

| Existing backend responsibility | New owner | New route / location |
| --- | --- | --- |
| Service Requests | JustinDeMatteis | `api/admin/justindematteis/service-requests.js` |
| Service Request assignment | JustinDeMatteis | `api/admin/justindematteis/service-request-assignment.js` |
| Service Request emails | JustinDeMatteis | `api/admin/justindematteis/service-request-emails.js` |
| Hiring Contacts | JustinDeMatteis | `api/admin/justindematteis/hiring-contacts.js` |
| Departments | JustinDeMatteis | `api/admin/justindematteis/departments.js` |
| Demo Requests | JustConsignIn | `api/admin/justconsignin/demo-requests.js` |
| Demo Request emails | JustConsignIn | `api/admin/justconsignin/demo-request-emails.js` |
| Demo scheduling | JustConsignIn | `api/admin/justconsignin/demo-request-schedule.js` |
| Beta applications | JustConsignIn | `api/admin/justconsignin/beta-partners.js` |
| Blog | Separate route for each site | `*/blog.js` |
| Page drafts / publishing | Separate route for each site | `*/pages.js` |
| Global styles | Separate route for each site | `*/styles.js` |
| Header/footer globals | Separate route for each site | `*/global-sections.js` |
| Project Request global drawer | JustinDeMatteis only | Justin global-sections route |
| Work Posts | JustinDeMatteis | `api/admin/justindematteis/work-posts.js` |
| AI Posts | JustinDeMatteis | `api/admin/justindematteis/ai-posts.js` |
| YouTube videos | Separate route for each site | `*/videos.js` |
| Social links | Separate route for each site | `*/social-links.js` |
| Media | Separate route / prefix for each site | `*/media.js` |
| Email settings | Separate route for each site | `*/email-settings.js` |
| Social AI | JustConsignIn | `api/admin/justconsignin/social-ai.js` |
| Social Automation | JustConsignIn | `api/admin/justconsignin/social-automation.js` |
| Metricool OAuth callback | JustConsignIn | `api/admin/justconsignin/metricool-callback.js` |
| Metricool MCP client | JustConsignIn | `api/admin/justconsignin/_lib/*` |
| Outreach Map | JustConsignIn static feature | No server API existed to migrate |
| Site listing | Shared registry endpoint | `api/admin/sites.js` |
| Email Edge Function source | Shared deployment source | `supabase/functions/send-site-email/index.ts` |

## Database checks performed

The active Supabase project was read-only audited during the rebuild.

Verified:

- both sites exist in `public.sites`;
- required `site_key` columns exist on multisite content tables;
- Service Request workflow fields exist;
- Service Request email attachment metadata exists;
- relevant admin tables have RLS enabled;
- owner RLS policies exist for the current admin tables.

## Deliberate changes from the old backend

1. No generic `site` request parameter for site-specific CRUD.
2. No service-role secret dependency for ordinary admin CRUD.
3. Justin and JustConsignIn email settings have separate server routes.
4. Justin notification settings require both Service Request and Hiring Contact destinations.
5. Metricool is explicitly JustConsignIn-owned.
6. New media paths are site-prefixed rather than one undifferentiated asset namespace.
