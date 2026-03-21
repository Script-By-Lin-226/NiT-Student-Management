from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.model import RefreshToken
from datetime import datetime

class TokenRepository:
    @staticmethod
    async def create_token(session: AsyncSession, user_id: int, token: str, expires_at: datetime):
        new_token = RefreshToken(
            user_id=user_id,
            token=token,
            expires_at=expires_at
        )
        session.add(new_token)
        await session.commit()
        return new_token

    @staticmethod
    async def get_token(session: AsyncSession, token: str):
        query = select(RefreshToken).where(RefreshToken.token == token)
        result = await session.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def revoke_token(session: AsyncSession, token_id: int):
        query = select(RefreshToken).where(RefreshToken.id == token_id)
        result = await session.execute(query)
        token_obj = result.scalar_one_or_none()
        if token_obj:
            token_obj.is_revoked = True
            await session.commit()

    @staticmethod
    async def revoke_all_user_tokens(session: AsyncSession, user_id: int):
        query = select(RefreshToken).where(RefreshToken.user_id == user_id, RefreshToken.is_revoked == False)
        result = await session.execute(query)
        tokens = result.scalars().all()
        for t in tokens:
            t.is_revoked = True
        await session.commit()
