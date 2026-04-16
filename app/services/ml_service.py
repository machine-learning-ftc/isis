import logging
from typing import Any

import httpx

from app.core.config import get_settings
from app.schemas.dto import FactCheckDTO, Verdict
from app.services.http_client import get_http_client

logger = logging.getLogger(__name__)


class MLServiceError(RuntimeError):
    """Raised when the ML service cannot be reached or returns invalid data."""


_VALID_VERDICTS: set[Verdict] = {"true", "false", "uncertain"}


def _coerce_verdict(raw: Any) -> Verdict:
    if isinstance(raw, str) and raw.lower() in _VALID_VERDICTS:
        return raw.lower()  # type: ignore[return-value]
    return "uncertain"


def _coerce_confidence(raw: Any) -> float:
    try:
        value = float(raw)
    except (TypeError, ValueError):
        return 0.0
    return max(0.0, min(1.0, value))


def _parse_ml_payload(payload: dict[str, Any], query: str) -> FactCheckDTO:
    return FactCheckDTO(
        claim=str(payload.get("claim") or query),
        verdict=_coerce_verdict(payload.get("verdict")),
        confidence=_coerce_confidence(payload.get("confidence")),
        source="ml",
        url=None,
    )


async def predict(query: str) -> FactCheckDTO:
    """Ask the ML service to classify `query`.

    Raises `MLServiceError` when the service is unreachable or returns an
    unusable payload. The orchestrator turns that into a 503.
    """
    settings = get_settings()
    if not settings.ML_SERVICE_URL:
        raise MLServiceError("ML_SERVICE_URL not configured")

    client = get_http_client()
    headers: dict[str, str] = {}
    if settings.ML_SERVICE_API_KEY:
        headers["Authorization"] = f"Bearer {settings.ML_SERVICE_API_KEY}"

    try:
        response = await client.post(
            settings.ML_SERVICE_URL,
            json={"query": query},
            headers=headers,
        )
        response.raise_for_status()
    except httpx.TimeoutException as exc:
        logger.warning("ml_service timeout query=%r", query)
        raise MLServiceError("ml service timeout") from exc
    except httpx.HTTPStatusError as exc:
        logger.warning(
            "ml_service http_error status=%s query=%r",
            exc.response.status_code,
            query,
        )
        raise MLServiceError(
            f"ml service returned HTTP {exc.response.status_code}"
        ) from exc
    except httpx.HTTPError as exc:
        logger.warning("ml_service network_error=%s query=%r", exc, query)
        raise MLServiceError("ml service network error") from exc

    try:
        payload = response.json()
    except ValueError as exc:
        raise MLServiceError("ml service returned invalid JSON") from exc

    if not isinstance(payload, dict):
        raise MLServiceError("ml service returned unexpected payload shape")

    return _parse_ml_payload(payload, query)
