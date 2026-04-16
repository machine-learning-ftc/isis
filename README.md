# Fact-Checking Backend

Backend em FastAPI para verificação de informações. Recebe uma consulta, tenta verificá-la via API externa de fact-check e, quando não há resultado, recorre a um serviço de ML como fallback. Todos os resultados são persistidos em Postgres (Supabase).

## Requisitos

- Python 3.11+
- Postgres acessível (ou projeto Supabase)

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edite `.env` com as credenciais apropriadas.

## Executar

```bash
uvicorn app.main:app --reload
```

A API ficará em `http://localhost:8000`. Documentação interativa em `/docs`.

## Endpoints

- `GET /health` — liveness/readiness.
- `POST /check` — verifica uma afirmação.

### Exemplo

```bash
curl -X POST http://localhost:8000/check \
  -H "Content-Type: application/json" \
  -d '{"query": "A Terra é plana"}'
```

Resposta:

```json
{
  "status": "found",
  "data": {
    "verdict": "false",
    "confidence": 0.98,
    "source": "api",
    "url": "https://exemplo.com/artigo"
  }
}
```

## Testes

```bash
pytest
```

## Estrutura

```
app/
 ├── main.py                # Instância FastAPI + middlewares
 ├── api/routes.py          # Endpoint /check
 ├── services/              # Integrações externas (API + ML)
 ├── models/db_models.py    # Modelos SQLAlchemy
 ├── schemas/               # Schemas Pydantic (request/response/DTO)
 ├── core/config.py         # Configuração via pydantic-settings
 └── db/session.py          # Engine/sessão async SQLAlchemy
```
