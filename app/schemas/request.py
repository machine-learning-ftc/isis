from pydantic import BaseModel, Field


class CheckRequest(BaseModel):
    """Incoming payload for POST /check."""

    query: str = Field(
        min_length=1,
        max_length=2048,
        description="The statement the user wants to verify.",
    )
