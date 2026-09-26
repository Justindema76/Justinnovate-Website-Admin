# Justinnovate Website Admin

Clean rebuild of the shared admin product for two **separate** websites:

- JustinDeMatteis.com
- JustConsignIn.com

The repository is being built and tested independently before any production switch.

## Backend first

The backend uses explicit site namespaces:

```
api/
  _shared/
  admin/
    justindematteis/
    justconsignin/
```

There is no generic request-controlled `site` parameter for site-specific CRUD.

## Current backend modules

### JustinDeMatteis.com

- Service Requests
- Service Request department assignment
- Hiring Contacts
- Departments
- Pages
- Global Styles
- Header / Footer / Project Request sections

### JustConsignIn.com

- Demo Requests
- Beta Partners
- Pages
- Global Styles
- Header / Footer sections

## Checks

```bash
npm run check
```

This validates site isolation, syntax, forbidden secret-key usage, and tests.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
