from typing import Any

import httpx
import pytest

from app.services import ml_service


class _MockResponse:
    def __init__(self, status_code: int, payload: Any) -> None:
        self.status_code = status_code
        self._payload = payload

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            request = httpx.Request("POST", "https://example.com")
            response = httpx.Response(self.status_code, request=request)
            raise httpx.HTTPStatusError("boom", request=request, response=response)

    def json(self) -> Any:
        return self._payload


class _MockClient:
    def __init__(self, response: _MockResponse | Exception) -> None:
        self._response = response

    async def post(self, *_args: Any, **_kwargs: Any) -> _MockResponse:
        if isinstance(self._response, Exception):
            raise self._response
        return self._response


@pytest.mark.asyncio
async def test_predict_normalizes_verdict_and_confidence(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    payload = {"verdict": "TRUE", "confidence": "0.81", "claim": "claim X"}
    monkeypatch.setattr(
        ml_service,
        "get_http_client",
        lambda: _MockClient(_MockResponse(200, payload)),
    )

    result = await ml_service.predict("claim X")

    assert result.verdict == "true"
    assert result.confidence == pytest.approx(0.81)
    assert result.source == "ml"
    assert result.url is None


@pytest.mark.asyncio
async def test_predict_coerces_invalid_values(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        ml_service,
        "get_http_client",
        lambda: _MockClient(
            _MockResponse(200, {"verdict": "nonsense", "confidence": "abc"})
        ),
    )

    result = await ml_service.predict("query")

    assert result.verdict == "uncertain"
    assert result.confidence == 0.0


@pytest.mark.asyncio
async def test_predict_raises_on_timeout(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        ml_service,
        "get_http_client",
        lambda: _MockClient(httpx.TimeoutException("slow")),
    )

    with pytest.raises(ml_service.MLServiceError):
        await ml_service.predict("query")


@pytest.mark.asyncio
async def test_predict_raises_on_http_error(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        ml_service,
        "get_http_client",
        lambda: _MockClient(_MockResponse(500, {})),
    )

    with pytest.raises(ml_service.MLServiceError):
        await ml_service.predict("query")
