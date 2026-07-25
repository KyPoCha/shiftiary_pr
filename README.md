# Shiftiary Admin Assessment

Internal admin prototype for the Rozpis assessment.

## Local Development

```bash
npm install
npm run dev:full
```

Separate frontend/API commands:

```bash
npm run db:migrate:local
npm run api:dev
npm run dev
```

Optional LLM extraction:

```bash
cp .dev.vars.example .dev.vars
```

Then add `OPENAI_API_KEY` to `.dev.vars` before running the Worker.
The key is read only by the Cloudflare Worker API; React calls the Worker and never receives the secret.

## Validation

```bash
npm run build
```

## Documentation

- [Architecture notes](docs/architecture.md)
- [Task 1 admin UI](docs/task-1-admin-ui.md)
- [Task 2 generator validation](docs/task-2-generator-validation.md)
- [Bonus text configuration](docs/bonus-text-configuration.md)
- [Backend, API, and data sync](docs/backend-api-db.md)
- [Deployment](docs/deployment.md)
