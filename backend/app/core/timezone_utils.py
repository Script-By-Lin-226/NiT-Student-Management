from datetime import datetime, timezone, timedelta
from app.core.config import settings

def get_now_utc() -> datetime:
    """Returns current UTC time."""
    return datetime.now(timezone.utc)

def get_now_local() -> datetime:
    """Returns current local time based on TZ_OFFSET settings."""
    offset = timedelta(hours=settings.TZ_OFFSET)
    return datetime.now(timezone.utc) + offset

def get_timestamp_iso(dt: datetime) -> str:
    """Returns ISO string with Z suffix for UTC times."""
    if not dt:
        return None
    # Assuming dt is naive and stored as UTC
    return f"{dt.isoformat()}Z"
