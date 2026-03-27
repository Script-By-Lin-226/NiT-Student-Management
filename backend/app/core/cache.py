import json
import logging
from typing import Any, Optional, Union
import redis.asyncio as redis
from app.core.config import settings

logger = logging.getLogger(__name__)

class CacheManager:
    _instance: Optional['CacheManager'] = None
    _client: Optional[redis.Redis] = None
    _local_cache: dict = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(CacheManager, cls).__new__(cls)
        return cls._instance

    async def connect(self):
        if not settings.ENABLE_CACHE:
            return
        
        try:
            self._client = redis.from_url(
                settings.REDIS_URL, 
                encoding="utf-8", 
                decode_responses=True,
                socket_timeout=2.0,
                socket_connect_timeout=2.0
            )
            # Test connection
            await self._client.ping()
            logger.info("Successfully connected to Redis cache")
        except Exception as e:
            logger.warning(f"Failed to connect to Redis: {e}. Falling back to in-memory cache.")
            self._client = None

    async def get(self, key: str) -> Optional[Any]:
        if not settings.ENABLE_CACHE:
            return None
            
        try:
            if self._client:
                data = await self._client.get(key)
                return json.loads(data) if data else None
            
            # Local cache with TTL
            if key in self._local_cache:
                val, expires = self._local_cache[key]
                import time
                if expires < time.time():
                    del self._local_cache[key]
                    return None
                return val
            return None
        except Exception as e:
            logger.error(f"Cache get error for key {key}: {e}")
            return None

    async def set(self, key: str, value: Any, expire: int = 3600):
        if not settings.ENABLE_CACHE:
            return
            
        try:
            if self._client:
                serialized = json.dumps(value)
                await self._client.set(key, serialized, ex=expire)
            else:
                import time
                self._local_cache[key] = (value, time.time() + expire)
        except Exception as e:
            logger.error(f"Cache set error for key {key}: {e}")

    async def delete(self, key: str):
        if not settings.ENABLE_CACHE:
            return
            
        try:
            if self._client:
                await self._client.delete(key)
            elif key in self._local_cache:
                del self._local_cache[key]
        except Exception as e:
            logger.error(f"Cache delete error for key {key}: {e}")

    async def close(self):
        if self._client:
            await self._client.close()

cache_manager = CacheManager()
