import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, Index, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class FactCheck(Base):
    """Persistent record for each fact-check operation (API or ML)."""

    __tablename__ = "fact_checks"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    query: Mapped[str] = mapped_column(String(2048), nullable=False)
    claim: Mapped[str] = mapped_column(String(4096), nullable=False)
    verdict: Mapped[str] = mapped_column(String(16), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    source: Mapped[str] = mapped_column(String(8), nullable=False)
    url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        Index("ix_fact_checks_created_at", "created_at"),
        Index("ix_fact_checks_query", "query"),
    )
