# Documentação de testes — Fact Verification API (ISIS)

Guia para testes manuais e automatizados de todas as rotas HTTP expostas pelo backend Bun + Elysia.

## Visão geral

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/v1/check` | Verifica uma afirmação (Google Fact Check → fallback ML) |
| `GET` | `/v1/checks/:id` | Consulta um resultado persistido por UUID |
| `GET` | `/v1/health` | Liveness/readiness (DB + uptime) |
| `GET` | `/metrics` | Métricas Prometheus |

**Base URL (local):** `http://localhost:3000` (variável `PORT` no `.env`, padrão `3000`).

## Pré-requisitos para testes end-to-end

1. `.env` configurado a partir de `.env.example`.
2. Banco migrado: `./scripts/db-migrate.sh` ou `bun run db:migrate:supabase`.
3. API rodando: `bun run dev`.
4. Para caminho **found**: `FACT_CHECK_API_KEY` válida.
5. Para caminho **predicted**: microserviço ML em `../ml` (`python app.py`) com `ML_SERVICE_URL=http://localhost:5001/predict`.
6. Para `GET /v1/checks/:id` com sucesso: `POST /v1/check` anterior com persistência OK (`"db": "up"` no health).

## Convenções

### Cabeçalhos

| Cabeçalho | Direção | Descrição |
|-----------|---------|-----------|
| `Content-Type` | Request | `application/json` em `POST /v1/check` |
| `x-request-id` | Request (opcional) | UUID; se omitido, o servidor gera um |
| `x-request-id` | Response | Sempre presente (eco ou gerado) |

### Formato de erro

Todas as respostas de erro seguem:

```json
{
  "code": "string",
  "message": "string",
  "requestId": "uuid"
}
```

| `code` | HTTP | Quando |
|--------|------|--------|
| `invalid_input` | 400 | Payload inválido, query vazia/só espaços, query > 2048 chars, UUID inválido em `:id` |
| `not_found` | 404 | `GET /v1/checks/:id` sem registro |
| `providers_unavailable` | 503 | Google e ML falharam |
| `internal_error` | 500 | Erro inesperado |

---

## 1. `POST /v1/check`

Verifica uma afirmação textual. Fluxo: provedor primário (Google) → fallback ML → persistência opcional.

### Request

```http
POST /v1/check
Content-Type: application/json

{
  "query": "texto da afirmação a verificar"
}
```

| Campo | Tipo | Regras |
|-------|------|--------|
| `query` | `string` | Obrigatório; 1–2048 caracteres no JSON; após `trim()`, não pode ficar vazio |

### Response `200` — sucesso

```json
{
  "id": "uuid | null",
  "status": "found | predicted",
  "data": {
    "verdict": "true | false | uncertain",
    "confidence": 0.0,
    "source": "fact_api | ml",
    "url": "string | null"
  },
  "display": {
    "id": "uuid",
    "query": "string",
    "claim": "string",
    "verdict": "true | false | uncertain",
    "verdictLabel": "Verdadeiro | Falso | Incerto",
    "confidence": 0.0,
    "confidencePercent": 0.0,
    "source": "fact_api | ml",
    "sourceLabel": "Fact-check (Google) | Modelo de ML",
    "status": "found | predicted",
    "statusLabel": "Verificado na API | Estimado por ML",
    "publisher": "string | null",
    "ratingLabel": "string | null",
    "url": "string | null",
    "checkedAt": "ISO-8601",
    "checkedAtBr": "DD/MM/YYYY HH:mm"
  }
}
```

| Campo | Significado |
|-------|-------------|
| `status` / `display.status` | `found` = Google retornou claim; `predicted` = fallback ML |
| `id` | UUID salvo no banco; `null` se persistência falhou (resposta ainda 200) |
| `data` | Contrato enxuto para integrações |
| `display` | Projeção com labels em PT-BR para UI |

### Cenários de teste

#### TC-CHECK-01 — Caminho primário (Google)

**Pré-condição:** API key Google válida; query com cobertura em fact-check.

```bash
curl -sS -X POST http://localhost:3000/v1/check \
  -H "Content-Type: application/json" \
  -H "x-request-id: test-check-primary-001" \
  -d '{"query":"urnas eletrônicas foram fraudadas"}' | jq .
```

**Esperado:**

- HTTP `200`
- Header `x-request-id: test-check-primary-001`
- `status` = `"found"`
- `data.source` = `"fact_api"`
- `display.sourceLabel` = `"Fact-check (Google)"`
- `display.statusLabel` = `"Verificado na API"`
- `id` = UUID válido (se DB up)
- `data.verdict` ∈ `true`, `false`, `uncertain`
- `data.confidence` entre `0` e `1`

#### TC-CHECK-02 — Fallback ML

**Pré-condição:** ML rodando em `localhost:5001`; query improvável no índice Google.

```bash
curl -sS -X POST http://localhost:3000/v1/check \
  -H "Content-Type: application/json" \
  -d '{"query":"xyz query unlikely to exist in fact check index"}' | jq .
```

**Esperado:**

- HTTP `200`
- `status` = `"predicted"`
- `data.source` = `"ml"`
- `display.statusLabel` = `"Estimado por ML"`
- Métrica `check_fallback_total` incrementa (ver `/metrics`)

#### TC-CHECK-03 — Provedores indisponíveis

**Pré-condição:** ML parado e/ou Google sem resultado; ou ambiente sem chaves válidas para o cenário desejado.

```bash
curl -sS -w "\nHTTP %{http_code}\n" -X POST http://localhost:3000/v1/check \
  -H "Content-Type: application/json" \
  -d '{"query":"Unknown claim"}'
```

**Esperado:**

- HTTP `503`
- Body: `code` = `"providers_unavailable"`, `requestId` presente

#### TC-CHECK-04 — Query vazia (schema)

```bash
curl -sS -w "\nHTTP %{http_code}\n" -X POST http://localhost:3000/v1/check \
  -H "Content-Type: application/json" \
  -d '{"query":""}'
```

**Esperado:** HTTP `400`, `code` = `"invalid_input"`, `message` contém payload inválido.

#### TC-CHECK-05 — Query só com espaços (domínio)

```bash
curl -sS -w "\nHTTP %{http_code}\n" -X POST http://localhost:3000/v1/check \
  -H "Content-Type: application/json" \
  -d '{"query":"   "}'
```

**Esperado:** HTTP `400`, `code` = `"invalid_input"`, mensagem sobre query vazia.

#### TC-CHECK-06 — Body inválido

```bash
# Sem campo query
curl -sS -w "\nHTTP %{http_code}\n" -X POST http://localhost:3000/v1/check \
  -H "Content-Type: application/json" \
  -d '{}'

# JSON malformado
curl -sS -w "\nHTTP %{http_code}\n" -X POST http://localhost:3000/v1/check \
  -H "Content-Type: application/json" \
  -d 'not-json'
```

**Esperado:** HTTP `400`, `code` = `"invalid_input"`.

#### TC-CHECK-07 — Query acima de 2048 caracteres

```bash
python3 -c "print('{\"query\":\"' + 'a'*2049 + '\"}')" | \
  curl -sS -w "\nHTTP %{http_code}\n" -X POST http://localhost:3000/v1/check \
  -H "Content-Type: application/json" \
  -d @-
```

**Esperado:** HTTP `400` (validação Elysia ou domínio).

#### TC-CHECK-08 — Fluxo E2E com leitura posterior

1. Executar TC-CHECK-01 ou TC-CHECK-02 e copiar `id` da resposta.
2. Chamar `GET /v1/checks/{id}` (seção 2).
3. Comparar campos de `display` com a resposta do POST.

---

## 2. `GET /v1/checks/:id`

Retorna a projeção `v_fact_checks_display` para um registro persistido.

### Request

```http
GET /v1/checks/{id}
```

| Parâmetro | Tipo | Regras |
|-----------|------|--------|
| `id` | UUID | Formato RFC 4122; inválido → 400 |

### Response `200`

Objeto `FactCheckDisplay` (mesma forma de `display` no POST, sem wrapper `data`):

```json
{
  "id": "uuid",
  "query": "string",
  "claim": "string",
  "verdict": "true | false | uncertain",
  "verdictLabel": "string",
  "confidence": 0.88,
  "confidencePercent": 88.0,
  "source": "fact_api | ml",
  "sourceLabel": "string",
  "status": "found | predicted",
  "statusLabel": "string",
  "publisher": "string | null",
  "ratingLabel": "string | null",
  "url": "string | null",
  "checkedAt": "2026-05-17T12:00:00.000Z",
  "checkedAtBr": "17/05/2026 09:00"
}
```

### Cenários de teste

#### TC-CHECKS-01 — Registro existente

**Pré-condição:** `id` obtido de um `POST /v1/check` bem-sucedido com `id` não nulo.

```bash
ID="11111111-1111-1111-1111-111111111111"  # substituir pelo id real
curl -sS http://localhost:3000/v1/checks/$ID | jq .
```

**Esperado:** HTTP `200`, campos alinhados ao `display` do POST.

#### TC-CHECKS-02 — Não encontrado

```bash
curl -sS -w "\nHTTP %{http_code}\n" \
  http://localhost:3000/v1/checks/00000000-0000-0000-0000-000000000000
```

**Esperado:**

- HTTP `404`
- `code` = `"not_found"`
- `message` = `"Fact check not found."`

#### TC-CHECKS-03 — UUID inválido

```bash
curl -sS -w "\nHTTP %{http_code}\n" \
  http://localhost:3000/v1/checks/not-a-uuid
```

**Esperado:** HTTP `400`, `code` = `"invalid_input"`.

#### TC-CHECKS-04 — Banco indisponível

**Pré-condição:** Postgres parado ou `DATABASE_URL` incorreta.

**Esperado:** HTTP `500`, `code` = `"internal_error"` (erro de persistência mapeado pelo middleware).

---

## 3. `GET /v1/health`

Healthcheck para load balancers e smoke tests de deploy.

### Request

```http
GET /v1/health
```

Sem body.

### Response `200`

```json
{
  "status": "ok | degraded",
  "uptimeMs": 12345,
  "db": "up | down"
}
```

| Campo | `ok` | `degraded` |
|-------|------|------------|
| `status` | DB respondeu ao ping | DB não respondeu |
| `db` | `"up"` | `"down"` |
| `uptimeMs` | ms desde o boot do processo | idem |

> O endpoint sempre retorna HTTP `200`; use `status` e `db` para decisão de readiness.

### Cenários de teste

#### TC-HEALTH-01 — Ambiente saudável

```bash
curl -sS http://localhost:3000/v1/health | jq .
```

**Esperado:**

- HTTP `200`
- `status` = `"ok"`
- `db` = `"up"`
- `uptimeMs` ≥ 0

#### TC-HEALTH-02 — Banco down

**Pré-condição:** `docker compose stop postgres` ou URL inválida.

```bash
curl -sS http://localhost:3000/v1/health | jq .
```

**Esperado:**

- HTTP `200`
- `status` = `"degraded"`
- `db` = `"down"`

#### TC-HEALTH-03 — Request ID

```bash
curl -sSI -H "x-request-id: test-health-001" http://localhost:3000/v1/health | grep -i x-request-id
```

**Esperado:** header `x-request-id: test-health-001`.

---

## 4. `GET /metrics`

Exportação Prometheus (scraping).

### Request

```http
GET /metrics
```

### Response `200`

- `Content-Type`: tipo do registry Prometheus (`text/plain` ou OpenMetrics, conforme `prom-client`)
- Body: texto com séries, por exemplo:
  - `http_requests_total`
  - `http_request_duration_ms`
  - `provider_calls_total`
  - `provider_duration_ms`
  - `check_fallback_total`
  - métricas default do Node/process

### Cenários de teste

#### TC-METRICS-01 — Endpoint acessível

```bash
curl -sS http://localhost:3000/metrics | head -20
```

**Esperado:** HTTP `200`, linhas `# HELP` / `# TYPE` ou formato OpenMetrics.

#### TC-METRICS-02 — Contadores após tráfego

1. Executar alguns `POST /v1/check` e `GET /v1/health`.
2. `curl http://localhost:3000/metrics | grep http_requests_total`

**Esperado:** séries com labels `route`, `method`, `status` incrementadas.

#### TC-METRICS-03 — Fallback contado

1. Forçar resposta `predicted` (TC-CHECK-02).
2. `curl -sS http://localhost:3000/metrics | grep check_fallback_total`

**Esperado:** contador `check_fallback_total` > 0.

---

## Matriz rápida (status HTTP)

| Rota | 200 | 400 | 404 | 500 | 503 |
|------|-----|-----|-----|-----|-----|
| `POST /v1/check` | ✓ sucesso | ✓ input | — | ✓* | ✓ providers |
| `GET /v1/checks/:id` | ✓ | ✓ UUID | ✓ not found | ✓ DB | — |
| `GET /v1/health` | ✓ | — | — | — | — |
| `GET /metrics` | ✓ | — | — | — | — |

\*Erros não tratados no handler podem resultar em 500 via `errorMapper`.

---

## Testes automatizados (Bun)

```bash
bun test
```

| Arquivo | Cobertura atual |
|---------|-----------------|
| `tests/integration/check.route.test.ts` | POST primário, fallback, 503 |
| `tests/integration/health.route.test.ts` | GET health OK |
| `tests/unit/*` | Domínio, env, use case `checkClaim` |

**Lacunas sugeridas para implementar:**

- `GET /v1/checks/:id` (200, 404, UUID inválido)
- `GET /metrics` (status e content-type)
- `POST /v1/check` casos 400 (query vazia, body inválido)
- Health com `db: down` (mock `checkDatabase`)

Exemplo de teste de integração (padrão do projeto):

```typescript
const response = await app.handle(
  new Request("http://localhost/v1/check", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: "..." }),
  }),
);
expect(response.status).toBe(200);
```

---

## Checklist de regressão (release)

- [ ] `GET /v1/health` → `status: ok`, `db: up`
- [ ] `POST /v1/check` caminho Google → `found`, `id` preenchido
- [ ] `POST /v1/check` fallback ML → `predicted`
- [ ] `GET /v1/checks/:id` com `id` do passo anterior
- [ ] `GET /metrics` retorna 200
- [ ] `bun test` e `bun run typecheck` verdes
- [ ] Registro visível em `fact_checks` / Supabase Table Editor

---

## Serviços relacionados (fora desta API)

O repositório ISIS **não** expõe as rotas abaixo; são do microserviço ML (`../ml`):

| Método | URL | Uso |
|--------|-----|-----|
| `GET` | `http://localhost:5001/health` | Health do ML |
| `POST` | `http://localhost:5001/predict` | Fallback interno do ISIS |

Código legado Python em `app/` (FastAPI) não é o runtime documentado aqui; o backend ativo é `src/main.ts` + Elysia.
