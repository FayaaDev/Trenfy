import asgi
from workers import WorkerEntrypoint

from app import app
from workflows.trends_scheduler import scheduler


class Default(WorkerEntrypoint):
    async def fetch(self, request):
        return await asgi.fetch(app, request, self.env)

    async def scheduled(self, controller, env, ctx):
        batch_size = _int_env(env, "CRON_SCAN_BATCH_SIZE", 5)
        result = await scheduler.run_due_sources(batch_size=batch_size)
        print(f"[Cron] trend scan complete: {result}")


def _int_env(env, key, default):
    value = getattr(env, key, default)
    try:
        return int(value)
    except (TypeError, ValueError):
        return default
