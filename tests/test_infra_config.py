from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def _read(rel_path: str) -> str:
    return (ROOT / rel_path).read_text(encoding="utf-8")


def _assert_contains(content: str, needle: str, label: str) -> None:
    if needle not in content:
        raise AssertionError(f"Missing {label}: {needle}")


def test_dockerfile_runtime_contract() -> None:
    dockerfile = _read("Dockerfile")
    _assert_contains(dockerfile, "FROM python:3.12-slim", "docker base image")
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


def test_compose_backend_hosted_nocodb_contract() -> None:
    compose = _read("docker-compose.yml")
    _assert_contains(compose, "trenfy-backend:", "backend service")
    _assert_contains(compose, "env_file:", "backend env_file")
    _assert_contains(compose, "- .env", "backend env_file path")
    _assert_contains(
        compose,
        "NOCODB_API_URL=https://nocodb.fayaa92.sa",
        "hosted nocodb URL override",
    )

    if "nocodb:" in compose:
        raise AssertionError("Compose should not include a local nocodb service")

    if "NOCODB_API_URL=http://nocodb:8080" in compose:
        raise AssertionError(
            "Compose should not override NOCODB_API_URL to local nocodb"
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
        "X_BEARER_TOKEN=",
        "SERVER_PORT=",
        "LOG_LEVEL=",
        "TRENDS_ENABLED=",
        "CORS_ORIGINS=",
    ]
    for key in required_keys:
        _assert_contains(env_example, key, ".env key")


def test_cloudflare_worker_runtime_contract() -> None:
    wrangler = _read("wrangler.jsonc")
    worker = _read("worker.js")

    _assert_contains(wrangler, '"main": "worker.js"', "Cloudflare Worker entrypoint")
    _assert_contains(
        wrangler,
        '"run_worker_first": ["/api/*", "/health*"]',
        "API routes run before static assets",
    )
    _assert_contains(wrangler, '"custom_domain": true', "custom domain route")
    _assert_contains(worker, "'/api/trends'", "trends API route")
    _assert_contains(worker, "'/api/categories'", "categories API route")
    _assert_contains(worker, "'/health'", "health route")


if __name__ == "__main__":
    test_dockerfile_runtime_contract()
    test_compose_backend_hosted_nocodb_contract()
    test_env_contract_keys()
    test_cloudflare_worker_runtime_contract()
    print("infra-config-contract-ok")
