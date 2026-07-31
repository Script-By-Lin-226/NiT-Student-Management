from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.model import RefreshToken
from datetime import datetime


class TokenRepository:

    @staticmethod
    async def create_token(session: AsyncSession, user_id: int, token: str, expires_at: datetime):
        new_token = RefreshToken(
            user_id=user_id,
            token=token,
            expires_at=expires_at,
        )
        session.add(new_token)
        await session.commit()
        return new_token

    @staticmethod
    async def get_token(session: AsyncSession, token: str):
        result = await session.execute(
            select(RefreshToken).where(RefreshToken.token == token)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def revoke_token(session: AsyncSession, token_id: int):
        """Revoke a single token by ID using a bulk UPDATE (no SELECT + loop)."""
        await session.execute(
            update(RefreshToken)
            .where(RefreshToken.id == token_id)
            .values(is_revoked=True, revoked_at=datetime.utcnow())
        )
        await session.commit()

    @staticmethod
    async def revoke_all_user_tokens(session: AsyncSession, user_id: int):
        """Revoke all active tokens for a user with a single bulk UPDATE.
        
        Previously used SELECT + Python loop + N commits (N+1 problem).
        Now a single UPDATE statement — much faster at scale.
        """
        await session.execute(
            update(RefreshToken)
            .where(
                RefreshToken.user_id == user_id,
                RefreshToken.is_revoked == False,
            )
            .values(is_revoked=True, revoked_at=datetime.utcnow())
        )
        await session.commit()
