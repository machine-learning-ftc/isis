import logging
from typing import Any

import httpx

from app.core.config import get_settings
from app.schemas.dto import FactCheckDTO, Verdict
from app.services.http_client import get_http_client

logger = logging.getLogger(__name__)

_VERDICT_MAP: dict[str, Verdict] = {
    "true": "true",
    "mostly true": "true",
    "correct": "true",
    "false": "false",
    "mostly false": "false",
    "incorrect": "false",
    "pants on fire": "false",
    "misleading": "uncertain",
    "mixture": "uncertain",
    "unproven": "uncertain",
}


def _normalize_verdict(raw: str | None) -> Verdict:
    if not raw:
        return "uncertain"
    return _VERDICT_MAP.get(raw.strip().lower(), "uncertain")


def _parse_api_payload(payload: dict[str, Any]) -> FactCheckDTO | None:
    """Extract the first relevant claim from the upstream payload.

    The shape assumes something close to Google Fact Check Tools API but falls
    back gracefully if fields are missing.
    """
    claims = payload.get("claims") or []
    if not claims:
        return None

    first = claims[0]
    claim_text = first.get("text") or first.get("claim") or ""
    reviews = first.get("claimReview") or []
    review = reviews[0] if reviews else {}

    verdict = _normalize_verdict(review.get("textualRating"))
    url = review.get("url")

    raw_confidence = first.get("confidence") or review.get("confidence")
    confidence = float(raw_confidence) if raw_confidence is not None else 0.8

    return FactCheckDTO(
        claim=claim_text or "",
        verdict=verdict,
        confidence=max(0.0, min(1.0, confidence)),
        source="api",
        url=url,
    )


async def get_fact_check(query: str) -> FactCheckDTO | None:
    """Look up `query` in the external fact-check API.

    Returns a normalized DTO when a reviewed claim is found, or `None` when
    nothing is found or the upstream is unreachable (so the orchestrator can
    fall back to ML).
    """
    settings = get_settings()
    if not settings.FACT_CHECK_API_URL:
        logger.warning("FACT_CHECK_API_URL not configured; skipping external lookup")
        return None

    client = get_http_client()
    params: dict[str, str] = {"query": query}
    if settings.FACT_CHECK_API_KEY:
        params["key"] = settings.FACT_CHECK_API_KEY

    try:
        response = await client.get(settings.FACT_CHECK_API_URL, params=params)
        response.raise_for_status()
    except httpx.TimeoutException:
        logger.warning("fact_check_api timeout query=%r", query)
        return None
    except httpx.HTTPStatusError as exc:
        logger.warning(
            "fact_check_api http_error status=%s query=%r",
            exc.response.status_code,
            query,
        )
        return None
    except httpx.HTTPError as exc:
        logger.warning("fact_check_api network_error=%s query=%r", exc, query)
        return None

    try:
        payload = response.json()
    except ValueError:
        logger.warning("fact_check_api invalid_json query=%r", query)
        return None

    return _parse_api_payload(payload)
