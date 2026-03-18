from app.security.jwt_tok import decode_token
from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from jose import jwt, JWTError


EXCLUDE_PATH = ["/auth/login" , "/auth/register" , "/docs" , "/openapi.json" , "/redoc" , "/favicon.ico"]


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):

        # Skip public routes
        if request.method == "OPTIONS":
            return await call_next(request)
        
        if request.url.path in EXCLUDE_PATH:
            return await call_next(request)

        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
        else:
            token = request.cookies.get("access_token")

        if not token:
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing or invalid token"}
            )   

        try:
            payload = await decode_token(token)
            request.state.user = payload  # attach user info
        except JWTError:
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid token"}
            )

        return await call_next(request)