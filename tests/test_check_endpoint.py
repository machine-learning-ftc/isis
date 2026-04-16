from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import FactCheck
from app.schemas.dto import FactCheckDTO
from app.services import fact_check_service, ml_service


@pytest.mark.asyncio
async def test_check_returns_found_when_external_api_has_result(
    client: TestClient,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    dto = FactCheckDTO(
        claim="A afirmação X",
        verdict="false",
        confidence=0.92,
        source="api",
        url="https://example.com/artigo",
    )
    monkeypatch.setattr(
        fact_check_service,
        "get_fact_check",
        AsyncMock(return_value=dto),
    )

    response = client.post("/check", json={"query": "afirmação X"})

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "found"
    assert body["data"]["source"] == "api"
    assert body["data"]["verdict"] == "false"
    assert body["data"]["confidence"] == pytest.approx(0.92)

    persisted = (await db_session.execute(select(FactCheck))).scalars().all()
    assert len(persisted) == 1
    assert persisted[0].source == "api"


@pytest.mark.asyncio
async def test_check_falls_back_to_ml_when_api_returns_none(
    client: TestClient,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        fact_check_service,
        "get_fact_check",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(
        ml_service,
        "predict",
        AsyncMock(
            return_value=FactCheckDTO(
                claim="afirmação Y",
                verdict="uncertain",
                confidence=0.55,
                source="ml",
                url=None,
            )
        ),
    )

    response = client.post("/check", json={"query": "afirmação Y"})

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "predicted"
    assert body["data"]["source"] == "ml"
    assert body["data"]["verdict"] == "uncertain"

    persisted = (await db_session.execute(select(FactCheck))).scalars().all()
    assert len(persisted) == 1
    assert persisted[0].source == "ml"


@pytest.mark.asyncio
async def test_check_returns_503_when_both_upstreams_fail(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        fact_check_service,
        "get_fact_check",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(
        ml_service,
        "predict",
        AsyncMock(side_effect=ml_service.MLServiceError("boom")),
    )

    response = client.post("/check", json={"query": "qualquer coisa"})

    assert response.status_code == 503
    assert "unavailable" in response.json()["detail"].lower()


def test_check_rejects_empty_query(client: TestClient) -> None:
    response = client.post("/check", json={"query": ""})
    assert response.status_code == 422


def test_health_endpoint(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
