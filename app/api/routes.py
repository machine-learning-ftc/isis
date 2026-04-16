import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.db_models import FactCheck
from app.schemas.dto import FactCheckDTO
from app.schemas.request import CheckRequest
from app.schemas.response import CheckResponse, FactCheckData
from app.services import fact_check_service, ml_service

logger = logging.getLogger(__name__)

router = APIRouter()


async def _persist(db: AsyncSession, query: str, dto: FactCheckDTO) -> None:
    record = FactCheck(
        query=query,
        claim=dto.claim,
        verdict=dto.verdict,
        confidence=dto.confidence,
        source=dto.source,
        url=dto.url,
    )
    db.add(record)
    await db.commit()


def _to_response(dto: FactCheckDTO) -> CheckResponse:
    return CheckResponse(
        status="found" if dto.source == "api" else "predicted",
        data=FactCheckData(
            verdict=dto.verdict,
            confidence=dto.confidence,
            source=dto.source,
            url=dto.url,
        ),
    )


@router.post("/check", response_model=CheckResponse)
async def check_facts(
    payload: CheckRequest,
    db: AsyncSession = Depends(get_db),
) -> CheckResponse:
    """Verify a statement against the external fact-check API, falling back to ML.

    Business rules (SDD §8):
      - The external API is always tried first.
      - ML only runs as a fallback when the API has no result.
      - Every successful verification is persisted.
      - The response makes the origin (API vs ML) explicit.
    """
    query = payload.query.strip()
    logger.info("check.start query_len=%d", len(query))

    api_result = await fact_check_service.get_fact_check(query)
    if api_result is not None:
        await _persist(db, query, api_result)
        logger.info("check.end source=api verdict=%s", api_result.verdict)
        return _to_response(api_result)

    try:
        ml_result = await ml_service.predict(query)
    except ml_service.MLServiceError as exc:
        logger.error("check.failed both_upstreams_unavailable error=%s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Fact-check and ML services are currently unavailable",
        ) from exc

    await _persist(db, query, ml_result)
    logger.info("check.end source=ml verdict=%s", ml_result.verdict)
    return _to_response(ml_result)


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
