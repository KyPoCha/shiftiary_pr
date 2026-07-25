# Architecture Notes

## Direction

This repository is a single deployable admin prototype with feature slices.

```txt
src/
  app/
    routes/
    layout/
  features/
    accounts/
      components/
      data/
      types.ts
    generator-evaluation/
      components/
      data/
      types.ts
    text-configuration/
      components/
      engine/
      types.ts
    help-center/
      components/
      data/
      types.ts
  shared/
    api/
    components/
    utils/
  worker/
    db/
    index.ts
```

## Stack

- React, TypeScript, Vite for the local admin UI.
- Zod for runtime validation at boundaries: API payloads, form input, imported fixtures, and later LLM output.
- Drizzle ORM for the Cloudflare D1 schema and Worker-side data access.
- Wrangler for local Worker/D1 development, migrations, and production deployment.
- Cloudflare Workers and D1 are the intended production target.

## Environments

The UI can run with local browser storage for quick review, or against the local Wrangler Worker API:

- `VITE_APP_ENV`
- `VITE_API_BASE_URL`

Local API development uses `npm run api:dev` and D1 migrations. Production should point the frontend at the deployed Worker or colocated API route.

## Extension Points

- `features/accounts` owns customer account administration.
- `features/generator-evaluation` owns Task 2 validation dashboards, benchmark input data, and the local simulation engine.
- `features/text-configuration` owns the bonus text-to-settings workflow, including structured intent extraction, validation, preview diffs, and local apply history.
- `features/help-center` owns global and contextual help content.
- `shared/api` owns the local admin data provider and API client boundary.
- `worker` owns the Cloudflare Worker API, Drizzle schema, and D1 access.
- `migrations` owns the D1 SQL migration history.
- The Worker can later expose narrower command endpoints instead of whole-snapshot sync.
- Shared domain schemas can be moved into a package once the API exists.
