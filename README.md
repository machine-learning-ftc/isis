# Fact Verification API (ISIS)

Stateless HTTP API for claim verification built with Bun, Elysia, strict TypeScript, Drizzle, and PostgreSQL (Supabase-compatible).

## Architecture

1. **Primary:** Google Fact Check Tools API (`claims:search`)
2. **Fallback:** ML microservice at `../ml` (Flask, port `5001`)
3. **Persistence:** `fact_checks` table in Supabase/Postgres

```
POST /v1/check → Google API → (if mapped) persist + return found
              └→ ML /predict → (if success) persist + return predicted
              └→ 503 if both fail
```

## Prerequisites

- [Bun](https://bun.sh) 1.3+
- Google Fact Check API key ([Google Cloud Console](https://console.cloud.google.com/))
- Supabase project **or** local Postgres via Docker
- ML service: Python 3 + `modelo_eleicoes.pkl` and `vetorizador.pkl` in the `ml` repo root

## Environment

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase Postgres URI (pooler `6543` for app) |
| `FACT_CHECK_API_KEY` | Google Fact Check API key |
| `FACT_CHECK_LANGUAGE_CODE` | Default `pt-BR` for better PT coverage |
| `ML_SERVICE_URL` | Default `http://localhost:5001/predict` |
| `ML_SERVICE_API_KEY` | Optional; leave empty if ML has no auth |

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **Project Settings → Database** and copy the connection string (URI).
3. For `drizzle-kit migrate`, prefer the **Direct** connection (`port 5432`).
4. For the running app (`bun run dev`), prefer the **Session pooler** (`port 6543`).
5. Set `DATABASE_URL` in `.env` and run:

```bash
chmod +x scripts/db-migrate.sh
./scripts/db-migrate.sh
```

6. Verify: `curl http://localhost:3000/v1/health` → `"db": "up"`.

Canonical SQL migrations (ISIS + ML): `supabase/migrations/`

```bash
bun run db:migrate:supabase
```

Creates `fact_checks` and view `v_fact_checks_display` (labels for UI). Drizzle migrations in `src/infra/db/migrations/` must stay aligned.

**RLS (v1):** access tables only via backend `DATABASE_URL`; do not expose `fact_checks` to anonymous clients.

## Local Postgres (without Supabase)

```bash
docker compose up -d postgres
```

Set in `.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/factcheck
```

Then:

```bash
bun run db:migrate:supabase
# or
bun run db:migrate:local
```

## ML microservice (sibling repo)

```bash
cd ../ml
pip install -r requirements.txt
# Ensure modelo_eleicoes.pkl and vetorizador.pkl exist in this directory
python app.py
```

- Health: `GET http://localhost:5001/health`
- Predict: `POST http://localhost:5001/predict` with `{"query":"..."}`

## Run ISIS

```bash
bun install
bun run dev
```

Endpoints:

- `POST /v1/check` — body `{ "query": "..." }` → returns `data` + `display` (labels for UI)
- `GET /v1/checks/:id` — read persisted result from `v_fact_checks_display`
- `GET /v1/health`
- `GET /metrics`

### Smoke tests

Primary path (Google API returns claims):

```bash
curl -X POST http://localhost:3000/v1/check \
  -H "Content-Type: application/json" \
  -d '{"query":"urnas eletrônicas foram fraudadas"}'
```

Fallback path (query unlikely in Google index; ML must be running):

```bash
curl -X POST http://localhost:3000/v1/check \
  -H "Content-Type: application/json" \
  -d '{"query":"xyz query unlikely to exist in fact check index"}'
```

Check Supabase **Table Editor → fact_checks** after successful responses.

## Quality

```bash
bun test
bun run typecheck
bun run lint
```

## Related repository

ML fallback service: `/home/fernando/Documents/personal/ml`
