import asyncio
import os
import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import tools.openai_client as openai_client


class _FakeResponse:
    def raise_for_status(self):
        return None

    def json(self):
        return {"choices": [{"message": {"content": "مرحبا"}}]}


class _FakeAsyncClient:
    def __init__(self, *args, **kwargs):
        self.calls = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def post(self, url, headers=None, json=None):
        self.calls.append({"url": url, "headers": headers, "json": json})
        return _FakeResponse()


async def test_get_openai_client_uses_openrouter_http_api() -> None:
    fake_http = _FakeAsyncClient()

    with patch.dict(
        os.environ,
        {
            "OPENROUTER_API_KEY": "test-key",
            "OPENROUTER_BASE_URL": "https://openrouter.ai/api/v1",
            "OPENROUTER_HTTP_REFERER": "https://trenfy.local",
            "OPENROUTER_APP_TITLE": "Trenfy",
        },
        clear=False,
    ):
        openai_client.reset_client()
        with patch.object(openai_client.httpx, "AsyncClient", return_value=fake_http):
            client = openai_client.get_openai_client()
            response = await client.chat.completions.create(
                model="openai/gpt-4o-mini",
                messages=[{"role": "user", "content": "hi"}],
            )

    assert fake_http.calls == [
        {
            "url": "https://openrouter.ai/api/v1/chat/completions",
            "headers": {
                "Authorization": "Bearer test-key",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://trenfy.local",
                "X-OpenRouter-Title": "Trenfy",
            },
            "json": {
                "model": "openai/gpt-4o-mini",
                "messages": [{"role": "user", "content": "hi"}],
            },
        }
    ]
    assert response.choices[0].message.content == "مرحبا"


if __name__ == "__main__":
    asyncio.run(test_get_openai_client_uses_openrouter_http_api())
    print("test_openai_client.py: ok")
