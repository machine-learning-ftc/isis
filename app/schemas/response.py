from typing import Literal

from pydantic import BaseModel, Field, HttpUrl, model_validator


class FactCheckData(BaseModel):
    verdict: Literal["true", "false", "uncertain"]
    confidence: float = Field(ge=0.0, le=1.0)
    source: Literal["api", "ml"]
    url: HttpUrl | None = None


class CheckResponse(BaseModel):
    status: Literal["found", "predicted"]
    data: FactCheckData

    @model_validator(mode="after")
    def _validate_status_matches_source(self) -> "CheckResponse":
        if self.status == "found" and self.data.source != "api":
            raise ValueError("status='found' requires data.source='api'")
        if self.status == "predicted" and self.data.source != "ml":
            raise ValueError("status='predicted' requires data.source='ml'")
        return self
