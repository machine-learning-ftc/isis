import os
from collections.abc import AsyncIterator, Iterator

os.environ.setdefault("ENV", "test")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("FACT_CHECK_API_URL", "https://example.com/factcheck")
os.environ.setdefault("FACT_CHECK_API_KEY", "test-key")
os.environ.setdefault("ML_SERVICE_URL", "https://example.com/ml")
os.environ.setdefault("ML_SERVICE_API_KEY", "test-key")
os.environ.setdefault("HTTP_TIMEOUT_SECONDS", "1.0")

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


@pytest_asyncio.fixture
async def db_session() -> AsyncIterator[AsyncSession]:
    """Provide an isolated in-memory SQLite session per test."""
    from app.db.session import Base

    engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(bind=engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest.fixture
def client(db_session: AsyncSession) -> Iterator[TestClient]:
    """TestClient with the DB dependency swapped for the in-memory session."""
    from app.db.session import get_db
    from app.main import app

    async def _override_get_db() -> AsyncIterator[AsyncSession]:
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
