# Backend, API, And Data Sync

## Current Local Implementation

The app now has one shared admin data model used by:

- Customer Accounts
- Text Configuration
- Help Center context

`AdminDataProvider` is the frontend application data boundary. It stores:

- customers
- department accounts
- account groups
- feature toggles
- shadow-login policies
- generator rules
- audit events
- text configuration apply history

When `VITE_API_BASE_URL` is configured, the provider reads and writes through the backend API. Without that variable, it falls back to `localStorage` so the UI can still be reviewed offline.

## Local API

The backend API is a Cloudflare Worker served by Wrangler. The easiest local command starts migrations, the API, and the frontend together:

```bash
npm run dev:full
```

For separate processes, run the API manually:

Run it with:

```bash
npm run api:dev
```

Apply the local D1 migration first:

```bash
npm run db:migrate:local
```

Endpoints:

```txt
GET /api/admin-data
PUT /api/admin-data
POST /api/text-configuration/analyze
POST /api/text-configuration/apply
```

The local database is Wrangler's D1 SQLite state:

```txt
.wrangler/state/v3/d1
```

The schema is defined in two places:

- Drizzle tables: `src/worker/db/schema.ts`
- D1 migration: `migrations/0001_initial_admin_schema.sql`

The Worker seeds the local D1 database from the current sample data when the D1 database is empty.

Example local env:

```txt
VITE_API_BASE_URL=http://127.0.0.1:8787
```

Optional local Worker secrets:

```txt
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
```

Use `.dev.vars` for Worker secrets. `.env.local` remains only for Vite/browser configuration.

## Sync Flow

Customer Accounts and Text Configuration both use the same provider.

Example flow:

1. Admin opens Text Configuration.
2. Admin chooses target customer.
3. Admin writes: `JIP, 20 sester, nikdo nesmi slouzit dve nocni po sobe, export do EGJE.`
4. Worker extracts structured intent with the LLM, or falls back to deterministic extraction when no key is configured or the model call fails.
5. Zod and domain validation build a preview diff.
6. Admin applies the preview.
7. Shared store creates or updates the target account.
8. Feature toggle, generator rule, worker count, shadow policy, and audit history are updated.
9. Text configuration apply history is persisted in the same snapshot and D1 table.
10. Customer Accounts immediately reflects the same data.

The analyze response includes `extractionSource`, `extractionModel`, and `fallbackReason`, so the UI can show whether a preview was produced by the LLM or deterministic fallback.

## Production Direction

For Cloudflare production, the same boundary should use:

- Cloudflare Worker API
- D1 relational database
- Drizzle ORM schema
- Wrangler migrations
- typed request/response schemas
- transaction-aware write endpoints
- audit logging for every sensitive change

Recommended D1 tables:

- `customers`
- `accounts`
- `account_groups`
- `account_group_members`
- `feature_toggles`
- `shadow_login_policies`
- `generator_rules`
- `audit_events`
- `text_configuration_runs`

Text Configuration should write the original text, structured intent, preview diff, actor, and final applied changes.

Remote setup checklist:

1. Create the D1 database with `wrangler d1 create rozpis-admin`.
2. Replace `REPLACE_WITH_CLOUDFLARE_D1_DATABASE_ID` in `wrangler.jsonc`.
3. Run `npm run db:migrate:remote`.
4. Deploy the Worker API.
5. Set `OPENAI_API_KEY` as a Worker secret if LLM extraction should be enabled.
6. Set `VITE_API_BASE_URL` for the frontend production environment.
