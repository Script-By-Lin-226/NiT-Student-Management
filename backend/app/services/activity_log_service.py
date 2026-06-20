from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.model import ActivityLog, User
from app.services.rbac_portal import _get_user
from app.core.logging import logger

async def log_activity(request: Request, session: AsyncSession, action: str, details: str):
    """
    Centralized logging for system activities.
    Logs to both the database (activity_logs) and the system log file.
    """
    try:
        user_info = _get_user(request)
        user_id = user_info.get("user_id")
        
        # If user_id is missing, try looking it up once (cached in request state)
        if not user_id and user_info.get("user_code"):
            if hasattr(request.state, "user_id_cache"):
                user_id = request.state.user_id_cache
            else:
                async with session.begin_nested():
                    result = await session.execute(
                        select(User.user_id).where(User.user_code == user_info["user_code"])
                    )
                    user_id = result.scalar_one_or_none()
                request.state.user_id_cache = user_id

        if user_id:
            al = ActivityLog(
                user_id=user_id,
                action=action,
                details=details
            )
            session.add(al)
            await session.flush()
            await session.commit()

            # Also log to system file
            logger.info(f"Activity logged: [{user_info.get('username', 'Unknown')}] {action}: {details}")
    except Exception as e:
        logger.error(f"log_activity error: {str(e)}")
