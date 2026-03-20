"""Shared OpenRouter client with a minimal chat-completions interface."""

import importlib
import os
from typing import Any, Optional

import httpx


_openai_client: Optional[Any] = None
_agents_sdk_configured = False


class _ChatCompletionMessage:
    def __init__(self, content: Optional[str]):
        self.content = content


class _ChatCompletionChoice:
    def __init__(self, message: _ChatCompletionMessage):
        self.message = message


class _ChatCompletionResponse:
    def __init__(self, choices: list[_ChatCompletionChoice]):
        self.choices = choices


class _OpenRouterChatCompletions:
    def __init__(self, client: "_OpenRouterClient"):
        self._client = client

    async def create(self, **payload: Any) -> _ChatCompletionResponse:
        response = await self._client.post("/chat/completions", json_body=payload)
        data = response.json()
        choices = data.get("choices") or []
        normalized = []
        for choice in choices:
            message = choice.get("message") or {}
            normalized.append(
                _ChatCompletionChoice(_ChatCompletionMessage(message.get("content")))
            )
        return _ChatCompletionResponse(normalized)


class _OpenRouterChat:
    def __init__(self, client: "_OpenRouterClient"):
        self.completions = _OpenRouterChatCompletions(client)


class _OpenRouterClient:
    def __init__(self, api_key: str, base_url: str, default_headers: dict[str, str]):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.default_headers = default_headers
        self.chat = _OpenRouterChat(self)

    @property
    def headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            **self.default_headers,
        }

    async def post(self, path: str, json_body: dict[str, Any]) -> httpx.Response:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}{path}",
                headers=self.headers,
                json=json_body,
            )
        response.raise_for_status()
        return response


def _load_async_openai():
    try:
        module = importlib.import_module("openai")
    except ImportError as exc:
        raise RuntimeError(
            "OpenRouter support requires the optional `openai` package."
        ) from exc

    return module.AsyncOpenAI


def _load_agents_sdk():
    try:
        module = importlib.import_module("agents")
    except ImportError:
        return None, None

    return module.set_default_openai_api, module.set_default_openai_client


def _openrouter_base_url() -> str:
    return os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")


def _openrouter_default_headers() -> dict[str, str]:
    default_headers = {}

    http_referer = os.getenv("OPENROUTER_HTTP_REFERER")
    if http_referer:
        default_headers["HTTP-Referer"] = http_referer

    app_title = os.getenv("OPENROUTER_APP_TITLE")
    if app_title:
        default_headers["X-OpenRouter-Title"] = app_title

    return default_headers


def get_default_llm_model() -> str:
    """Return default OpenRouter model for chat completions."""
    return os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")


def has_openrouter_api_key() -> bool:
    """Return whether OpenRouter credentials are available."""
    return bool(os.getenv("OPENROUTER_API_KEY"))


def get_openai_client() -> Any:
    """
    Get or create OpenRouter client (lazy initialization).

    Returns:
        _OpenRouterClient: Configured OpenRouter client

    Raises:
        ValueError: If OPENROUTER_API_KEY is not set
    """
    global _openai_client
    if _openai_client is None:
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise ValueError(
                "OPENROUTER_API_KEY environment variable not set. "
                "Please configure it in .env file."
            )

        _openai_client = _OpenRouterClient(
            api_key=api_key,
            base_url=_openrouter_base_url(),
            default_headers=_openrouter_default_headers(),
        )
    return _openai_client


def configure_agents_sdk_for_openrouter() -> bool:
    """
    Configure OpenAI Agents SDK to route model calls through OpenRouter.

    Uses chat-completions API mode for best OpenRouter compatibility.

    Returns:
        bool: True when the SDK is configured, False when no API key is present.
    """
    global _agents_sdk_configured
    if _agents_sdk_configured:
        return True

    if not has_openrouter_api_key():
        return False

    set_default_openai_api, set_default_openai_client = _load_agents_sdk()
    if set_default_openai_api is None or set_default_openai_client is None:
        return False

    async_openai_cls = _load_async_openai()
    set_default_openai_client(
        async_openai_cls(
            api_key=os.getenv("OPENROUTER_API_KEY", ""),
            base_url=_openrouter_base_url(),
            default_headers=_openrouter_default_headers(),
        )
    )
    set_default_openai_api("chat_completions")
    _agents_sdk_configured = True
    return True


def reset_client() -> None:
    """Reset the cached OpenRouter client and SDK config (for testing)."""
    global _openai_client, _agents_sdk_configured
    _openai_client = None
    _agents_sdk_configured = False
