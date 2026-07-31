"""
Background Task Helpers
=======================
Lightweight asyncio-based background task utilities.

Usage:
    from fastapi import BackgroundTasks
    from app.core.background_tasks import run_in_background

    @router.post("/some-endpoint")
    async def endpoint(background_tasks: BackgroundTasks):
        background_tasks.add_task(run_in_background, some_coroutine())
        return {"message": "Processing started"}
"""
import asyncio
import logging
from typing import Coroutine, Any

logger = logging.getLogger(__name__)


async def run_in_background(coro: Coroutine) -> Any:
    """
    Safely run an async coroutine as a FastAPI BackgroundTask.
    Catches and logs exceptions so background failures don't crash the app.
    """
    try:
        return await coro
    except Exception as e:
        logger.error(f"Background task failed: {e}", exc_info=True)


async def fire_and_forget(coro: Coroutine) -> None:
    """
    Schedule a coroutine to run as an asyncio task without waiting.
    Use this for true fire-and-forget operations (e.g. cache warming, sequence resets).
    Must be called from within a running async context.
    """
    import asyncio
    loop = asyncio.get_event_loop()
    if loop.is_running():
        asyncio.ensure_future(safe_run(coro))
    else:
        logger.warning("fire_and_forget called outside a running event loop — task skipped.")


async def safe_run(coro: Coroutine) -> None:
    """Run a coroutine, logging any exceptions without raising."""
    try:
        await coro
    except Exception as e:
        logger.error(f"Fire-and-forget task failed: {e}", exc_info=True)
