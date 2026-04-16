from dataclasses import dataclass
from typing import Literal

Verdict = Literal["true", "false", "uncertain"]
Source = Literal["api", "ml"]


@dataclass(frozen=True, slots=True)
class FactCheckDTO:
    """Internal DTO shared by integration services and the orchestrator.

    Keeping it framework-agnostic (plain dataclass) lets services stay decoupled
    from Pydantic and the persistence layer.
    """

    claim: str
    verdict: Verdict
    confidence: float
    source: Source
    url: str | None = None
