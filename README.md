# Fact Verification API (ISIS)

HTTP API for automated claim verification. The service queries external fact-check sources, falls back to an ML model when needed, and persists results in PostgreSQL for later retrieval.

**Stack:** Bun, Elysia, TypeScript, Drizzle ORM, PostgreSQL.

## Architecture

| Layer | Responsibility |
|-------|----------------|
| Primary provider | Google Fact Check Tools API (`claims:search`) |
| Fallback provider | ML microservice (`../ml`, Flask on port `5001`) |
| Persistence | PostgreSQL table `fact_checks` and view `v_fact_checks_display` |

```
POST /v1/check
  → Google Fact Check API     → status: found   (persist + respond)
  → ML /predict (on no match) → status: predicted (persist + respond)
  → 503                       → both providers unavailable
```

## Prerequisites

- [Bun](https://bun.sh) 1.3+
- PostgreSQL 16+ (local via Docker Compose or any compatible instance)
- [Google Fact Check API key](https://console.cloud.google.com/)
- ML service (optional for fallback): Python 3 and model artifacts in the sibling `ml` repository

## Quick start

```bash
bun install
cp .env.example .env
# Edit .env: DATABASE_URL, FACT_CHECK_API_KEY, ML_SERVICE_URL

docker compose up -d postgres
chmod +x scripts/db-migrate.sh
./scripts/db-migrate.sh

bun run dev
```

Verify the service:

```bash
curl -s http://localhost:3000/v1/health
```

Expected: `"status": "ok"` and `"db": "up"`.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection URI |
| `FACT_CHECK_API_KEY` | Yes | Google Fact Check API key |
| `FACT_CHECK_API_URL` | No | Defaults to Google `claims:search` endpoint |
| `FACT_CHECK_LANGUAGE_CODE` | No | Default `pt-BR` |
| `ML_SERVICE_URL` | Yes | ML predict endpoint (default `http://localhost:5001/predict`) |
| `ML_SERVICE_API_KEY` | No | Set only if the ML service enforces auth |
| `PORT` | No | HTTP port (default `3000`) |
| `HOST` | No | Bind address (default `0.0.0.0`) |
| `HTTP_TIMEOUT_MS` | No | Outbound HTTP timeout in ms (default `700`) |
| `LOG_LEVEL` | No | `debug`, `info`, `warn`, or `error` |

See `.env.example` for a complete template.

## Database

Start PostgreSQL locally:

```bash
docker compose up -d postgres
```

Set in `.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/factcheck
```

Apply migrations:

```bash
./scripts/db-migrate.sh
# or: bun run db:migrate:local
```

Schema definitions live under `supabase/migrations/` (plain SQL, ORM-agnostic). The application uses Drizzle migrations in `src/infra/db/migrations/`; keep both in sync when changing the schema.

**Access model:** the API is the only intended consumer of `fact_checks`. Do not expose the table directly to untrusted clients.

## HTTP API

Base URL (local): `http://localhost:3000`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/check` | Verify a claim; body `{ "query": "..." }` |
| `GET` | `/v1/checks/:id` | Fetch a persisted result by UUID |
| `GET` | `/v1/health` | Liveness and database connectivity |
| `GET` | `/metrics` | Prometheus metrics |

Successful checks return a compact `data` object and a `display` object with Portuguese labels for UI consumption.

**Full reference:** request/response schemas, error codes, `curl` examples, and test scenarios are documented in [`docs/API-TESTING.md`](docs/API-TESTING.md).

### Example

```bash
curl -sS -X POST http://localhost:3000/v1/check \
  -H "Content-Type: application/json" \
  -d '{"query":"urnas eletrônicas foram fraudadas"}'
```

## ML microservice (fallback)

Run from the sibling repository:

```bash
cd ../ml
pip install -r requirements.txt
python app.py
```

| Method | URL |
|--------|-----|
| `GET` | `http://localhost:5001/health` |
| `POST` | `http://localhost:5001/predict` — body `{ "query": "..." }` |

The ISIS API calls this service automatically when the primary provider returns no match.

## Development

```bash
bun run dev      # watch mode
bun run start    # production-style run
bun test         # unit + integration tests
bun run typecheck
bun run lint
```

## Related repository

ML fallback service: [`../ml`](../ml) (relative to this project root).
