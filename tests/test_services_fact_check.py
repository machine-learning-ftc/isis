from typing import Any

import httpx
import pytest

from app.services import fact_check_service


class _MockResponse:
    def __init__(self, status_code: int, payload: Any) -> None:
        self.status_code = status_code
        self._payload = payload

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            request = httpx.Request("GET", "https://example.com")
            response = httpx.Response(self.status_code, request=request)
            raise httpx.HTTPStatusError("boom", request=request, response=response)

    def json(self) -> Any:
        return self._payload


class _MockClient:
    def __init__(self, response: _MockResponse | Exception) -> None:
        self._response = response

    async def get(self, *_args: Any, **_kwargs: Any) -> _MockResponse:
        if isinstance(self._response, Exception):
            raise self._response
        return self._response


@pytest.mark.asyncio
async def test_parse_api_payload_normalizes_verdict_and_url(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    payload = {
        "claims": [
            {
                "text": "A Terra é plana",
                "confidence": 0.97,
                "claimReview": [
                    {
                        "textualRating": "False",
                        "url": "https://example.com/review",
                    }
                ],
            }
        ]
    }
    monkeypatch.setattr(
        fact_check_service,
        "get_http_client",
        lambda: _MockClient(_MockResponse(200, payload)),
    )

    result = await fact_check_service.get_fact_check("A Terra é plana")

    assert result is not None
    assert result.verdict == "false"
    assert result.source == "api"
    assert result.url == "https://example.com/review"
    assert 0.0 <= result.confidence <= 1.0


@pytest.mark.asyncio
async def test_returns_none_when_no_claims(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        fact_check_service,
        "get_http_client",
        lambda: _MockClient(_MockResponse(200, {"claims": []})),
    )

    assert await fact_check_service.get_fact_check("qualquer") is None


@pytest.mark.asyncio
async def test_returns_none_on_timeout(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        fact_check_service,
        "get_http_client",
        lambda: _MockClient(httpx.TimeoutException("slow")),
    )

    assert await fact_check_service.get_fact_check("qualquer") is None


@pytest.mark.asyncio
async def test_returns_none_on_http_error(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        fact_check_service,
        "get_http_client",
        lambda: _MockClient(_MockResponse(500, {})),
    )

    assert await fact_check_service.get_fact_check("qualquer") is None
