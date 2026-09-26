# Justinnovate Website Admin — Backend Architecture

## Non-negotiable rule

This repository runs one admin product for **two separate websites**. Shared code is allowed only for infrastructure and reusable primitives. Site ownership is explicit and server-side.

### JustinDeMatteis.com

API namespace:

`/api/admin/justindematteis/*`

Owned backend modules:

- Service Requests
- Service Request department assignment
- Hiring Contacts
- Departments
- Pages
- Global Styles
- Header / Footer / Project Request global sections

### JustConsignIn.com

API namespace:

`/api/admin/justconsignin/*`

Owned backend modules:

- Demo Requests
- Beta Partners
- Pages
- Global Styles
- Header / Footer global sections

## Shared backend

`/api/_shared/*` is restricted to infrastructure that is truly shared:

- owner authentication
- Supabase user-token access
- request validation
- site registry
- reusable page/settings data functions

Shared modules must not contain JustinDeMatteis or JustConsignIn business workflows.

## Site isolation

A browser does **not** send `?site=...` to a generic endpoint.

Instead, the route itself owns the site:

- `/api/admin/justindematteis/service-requests`
- `/api/admin/justconsignin/demo-requests`

That prevents a frontend bug from accidentally querying or mutating the other website's data.

## Supabase security

Admin API calls use:

- the authenticated owner's access token
- the Supabase publishable/anon key
- database RLS

The new backend does **not** depend on `SUPABASE_SECRET_KEY` or a service-role key for ordinary admin CRUD.

## Automated guardrails

`npm run check` performs:

1. architecture validation
2. cross-site reference checks
3. rejection of request-controlled site selection
4. rejection of service-role secret usage
5. JavaScript syntax checks
6. Node tests

GitHub Actions runs these checks on every push and pull request.

## Migration policy

The existing live Website Admin repository is a source/reference only while this rebuild is being developed.

Nothing in production is switched to this repository until:

1. the backend is complete enough for the chosen test scope;
2. checks pass;
3. a separate test deployment works;
4. Justin reviews the code and UI;
5. the switch is explicitly approved.
