from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment / .env."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    ENV: Literal["development", "staging", "production", "test"] = "development"

    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/factcheck",
        description="Async SQLAlchemy DSN for Postgres / Supabase.",
    )

    FACT_CHECK_API_URL: str = Field(default="")
    FACT_CHECK_API_KEY: str = Field(default="")

    ML_SERVICE_URL: str = Field(default="")
    ML_SERVICE_API_KEY: str = Field(default="")

    HTTP_TIMEOUT_SECONDS: float = Field(
        default=0.7,
        ge=0.1,
        description="Timeout applied to outbound HTTP calls to keep P99 latency low.",
    )

    CORS_ORIGINS: str = Field(
        default="*",
        description="Comma separated list of allowed origins.",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        if not self.CORS_ORIGINS or self.CORS_ORIGINS == "*":
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
