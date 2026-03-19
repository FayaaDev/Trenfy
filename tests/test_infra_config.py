from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def _read(rel_path: str) -> str:
    return (ROOT / rel_path).read_text(encoding="utf-8")


def _assert_contains(content: str, needle: str, label: str) -> None:
    if needle not in content:
        raise AssertionError(f"Missing {label}: {needle}")


def test_dockerfile_runtime_contract() -> None:
    dockerfile = _read("Dockerfile")
    _assert_contains(dockerfile, "FROM python:3.11-slim", "docker base image")
    _assert_contains(dockerfile, "WORKDIR /app", "docker workdir")
    _assert_contains(dockerfile, "COPY pyproject.toml .", "pyproject copy")
    _assert_contains(dockerfile, "COPY workflows/ workflows/", "workflows copy")
    _assert_contains(
        dockerfile, "COPY trend_agents/ trend_agents/", "trend_agents copy"
    )
    _assert_contains(dockerfile, "COPY tools/ tools/", "tools copy")
    _assert_contains(dockerfile, "COPY config/ config/", "config copy")
    _assert_contains(dockerfile, "COPY app.py .", "app copy")
    _assert_contains(dockerfile, 'CMD ["uvicorn", "app:app"', "uvicorn command")
    _assert_contains(dockerfile, '--port", "8080"', "uvicorn port")


def test_compose_backend_nocodb_contract() -> None:
    compose = _read("docker-compose.yml")
    _assert_contains(compose, "trenfy-backend:", "backend service")
    _assert_contains(compose, "nocodb:", "nocodb service")
    _assert_contains(
        compose, "NOCODB_API_URL=http://nocodb:8080", "internal nocodb URL"
    )


def test_env_contract_keys() -> None:
    env_example = _read(".env.example")
    required_keys = [
        "NOCODB_BASE_ID=",
        "NOCODB_API_TOKEN=",
        "NOCODB_TRENDS_TABLE_ID=",
        "NOCODB_SOURCES_TABLE_ID=",
        "NOCODB_API_URL=",
        "YOUTUBE_API_KEY=",
        "SPOTIFY_CLIENT_ID=",
        "SPOTIFY_CLIENT_SECRET=",
        "STEAM_API_KEY=",
        "STEAM_PUBLISHER_KEY=",
        "SERVER_PORT=",
        "LOG_LEVEL=",
        "TRENDS_ENABLED=",
    ]
    for key in required_keys:
        _assert_contains(env_example, key, ".env key")


if __name__ == "__main__":
    test_dockerfile_runtime_contract()
    test_compose_backend_nocodb_contract()
    test_env_contract_keys()
    print("infra-config-contract-ok")
