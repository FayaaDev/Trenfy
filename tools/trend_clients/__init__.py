import importlib
import pkgutil
from functools import lru_cache
from pathlib import Path

from tools.trend_clients.base import BaseTrendClient

_CLIENT_SUFFIX = "_client"
_THIS_MODULE = Path(__file__).resolve().stem


def get_supported_platforms() -> list[str]:
    directory = Path(__file__).resolve().parent
    platforms: list[str] = []

    for module_info in pkgutil.iter_modules([str(directory)]):
        name = module_info.name
        if not name.endswith(_CLIENT_SUFFIX):
            continue
        if name in {"base", "common", _THIS_MODULE}:
            continue
        platform = name[: -len(_CLIENT_SUFFIX)]
        if platform:
            platforms.append(platform)

    return sorted(set(platforms))


@lru_cache(maxsize=32)
def _load_client_class(platform: str) -> type[BaseTrendClient]:
    module_name = f"{__name__}.{platform}{_CLIENT_SUFFIX}"

    try:
        module = importlib.import_module(module_name)
    except ModuleNotFoundError as exc:
        if exc.name == module_name:
            supported = ", ".join(get_supported_platforms()) or "none"
            raise ValueError(
                f"Unsupported platform: {platform}. Supported platforms: {supported}"
            ) from None
        raise

    client_class = getattr(module, "CLIENT_CLASS", None)
    if client_class is None:
        raise RuntimeError(
            f"{module_name} must expose CLIENT_CLASS for factory registration"
        )

    if not isinstance(client_class, type) or not issubclass(
        client_class, BaseTrendClient
    ):
        raise TypeError(f"{module_name}.CLIENT_CLASS must inherit BaseTrendClient")

    return client_class


def get_trend_client(platform: str) -> BaseTrendClient:
    normalized = (platform or "").strip().lower()
    if not normalized:
        raise ValueError("Platform is required")
    return _load_client_class(normalized)()


__all__ = ["BaseTrendClient", "get_trend_client", "get_supported_platforms"]
