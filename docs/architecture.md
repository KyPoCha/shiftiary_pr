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
  shared/
    components/
    utils/
```

## Stack

- React, TypeScript, Vite for the local admin UI.
- Zod for runtime validation at boundaries: API payloads, form input, imported fixtures, and later LLM output.
- Drizzle is the intended ORM when persistence is added.
- Cloudflare Workers and D1 are the intended production target after the local prototype and docs are stable.

## Environments

The first checkpoint uses mocked data so the domain and UX can move quickly. Environment variables are still named with production in mind:

- `VITE_APP_ENV`
- `VITE_API_BASE_URL`

Local development can point at a future Worker running on `localhost:8787`. Production should point the frontend at the deployed Worker or colocated API route.
