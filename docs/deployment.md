# Deployment

## Target

Production uses two Cloudflare resources:

- Cloudflare Worker API: D1 persistence and server-side LLM extraction.
- Cloudflare Pages: static Vite frontend.

The production deployment branch is `main`.

## Cloudflare Setup

Create a D1 database:

```bash
npx wrangler d1 create rozpis-admin
```

Copy the returned `database_id` into `wrangler.jsonc`:

```txt
env.production.d1_databases[0].database_id
```

Apply migrations and deploy the Worker once:

```bash
npm run db:migrate:remote
npm run deploy:worker
```

Then set the Worker secret:

```bash
npx wrangler secret put OPENAI_API_KEY --env production
```

`wrangler secret put --env production` expects the Worker `rozpis-admin-api-production` to already exist. If it does not exist yet, deploy the Worker first and then add the secret.

Create a Cloudflare Pages project for the frontend. Use:

```txt
Build command: npm run build
Build output directory: dist
Production branch: main
```

## GitHub Configuration

Repository secrets:

```txt
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

Repository variables:

```txt
CLOUDFLARE_PAGES_PROJECT_NAME
VITE_API_BASE_URL
```

`VITE_API_BASE_URL` should point to the deployed Worker API, for example:

```txt
https://rozpis-admin-api-production.<your-subdomain>.workers.dev
```

The Cloudflare API token needs permission to deploy Workers, deploy Pages, edit Worker secrets, and apply D1 migrations for this account.

## Deploy Flow

After merging `dev` into `main`, the GitHub workflow:

1. Installs dependencies.
2. Applies remote D1 migrations with `npm run db:migrate:remote`.
3. Deploys the Worker with `npm run deploy:worker`.
4. Builds the Vite frontend with `VITE_API_BASE_URL`.
5. Deploys `dist` to Cloudflare Pages.

## Local Verification Before Merge

```bash
npm run build
npx drizzle-kit check
```

Optional production dry run:

```bash
npx wrangler deploy --env production --dry-run
```

## Notes

Do not add `.dev.vars` or `OPENAI_API_KEY` to GitHub variables for the frontend. The OpenAI key belongs only in Worker secrets.

Cloudflare Pages uses `public/_redirects` so direct visits to React routes such as `/help-center` return `index.html`.
