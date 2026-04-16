import httpx

from app.core.config import get_settings

_client: httpx.AsyncClient | None = None


def get_http_client() -> httpx.AsyncClient:
    """Return a lazily-initialized shared AsyncClient.

    Reusing a single client across requests avoids connection churn and keeps
    latency predictable, which is critical for the < 1s SLA.
    """
    global _client
    if _client is None:
        settings = get_settings()
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(settings.HTTP_TIMEOUT_SECONDS),
        )
    return _client


async def close_http_client() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None
