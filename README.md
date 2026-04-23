# Fact Verification API

Stateless HTTP API for claim verification built with Bun, Elysia, strict TypeScript, Drizzle, and PostgreSQL-compatible storage.

## Stack

- Bun
- Elysia
- TypeScript (strict)
- Drizzle ORM
- PostgreSQL / Supabase
- Pino
- Prometheus metrics

## Endpoints

- `POST /v1/check`
- `GET /v1/health`
- `GET /metrics`

## Environment

Copy `.env.example` and fill in the values required by your environment:

```bash
cp .env.example .env
```

For Supabase, use the Postgres connection string in `DATABASE_URL`. The current migration targets the default `public` schema.

## Install

```bash
bun install
```

## Run

```bash
bun run dev
```

Production:

```bash
bun run start
```

## Database

Generate migrations:

```bash
bun run db:generate
```

Apply migrations:

```bash
bun run db:migrate
```

## Quality

Run tests:

```bash
bun test
```

Run coverage:

```bash
bun test --coverage
```

Run lint:

```bash
bun run lint
```

Run typecheck:

```bash
bun run typecheck
```
