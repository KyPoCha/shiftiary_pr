# Deployment

## Target

The current app is a static Vite frontend, so the production target is Cloudflare Pages. The `dev` branch is treated as the production deployment branch for this assessment.

## GitHub Actions

Two workflows are configured:

- `CI`: runs on pushes and pull requests to `dev` and `main`.
- `Deploy Cloudflare Pages`: runs on pushes to `dev` and can also be started manually.

Both workflows use Node.js 22 and `npm ci`.

## Required GitHub Configuration

Create a Cloudflare Pages project first. Configure its production branch as `dev`, otherwise deployments from `dev` can be treated as preview deployments instead of production.

Then add these values in GitHub:

- Repository secret `CLOUDFLARE_API_TOKEN`
- Repository secret `CLOUDFLARE_ACCOUNT_ID`
- Repository variable `CLOUDFLARE_PAGES_PROJECT_NAME`

The Cloudflare API token should be scoped only to deploy the selected Pages project/account.

## Local Commands

```bash
npm run build
npm run deploy:cloudflare -- --project-name <cloudflare-pages-project-name> --branch dev
```

## Notes

Runtime data is still mocked in frontend state. When persistence is added later, deployment will need D1 bindings, migrations, and a separate production data setup.

Cloudflare Pages uses `public/_redirects` so direct visits to React routes such as `/help-center` return `index.html`.
