import asyncio
import httpx
import logging
import os
from app.core.config import settings

logger = logging.getLogger(__name__)

async def keep_alive_task():
    """
    Background task that pings the application's health endpoint to prevent Render Free Tier from sleeping.
    Render Free Tier shuts down after 15 minutes of inactivity. Pinging every 10 minutes keeps it awake.
    """
    # Prefer RENDER_EXTERNAL_URL (which Render injects automatically)
    # If not set, use an environment variable or default to a placeholder
    external_url = getattr(settings, "RENDER_EXTERNAL_URL", None) or os.getenv("RENDER_EXTERNAL_URL")
    
    if not external_url:
        logger.warning("RENDER_EXTERNAL_URL is not set. Uptime pinging disabled.")
        return

    # Ensure the health check path is included
    if not external_url.endswith("/health"):
        # Remove trailing slash and append /health
        external_url = external_url.rstrip("/") + "/health"

    logger.info(f"Starting uptime keep-alive task for: {external_url}")

    async with httpx.AsyncClient() as client:
        while True:
            try:
                # Ping the health endpoint
                response = await client.get(external_url, timeout=30.0)
                if response.status_code == 200:
                    logger.info(f"Uptime ping successful: {external_url} - Status: {response.status_code}")
                else:
                    logger.warning(f"Uptime ping failed: {external_url} - Status: {response.status_code}")
            except Exception as e:
                logger.error(f"Uptime ping error for {external_url}: {e}")

            # Wait for 10 minutes (600 seconds) before the next ping
            # Render sleeps after 15 minutes, so 10 is a safe margin.
            await asyncio.sleep(600)
