import logging
from datetime import datetime, timezone, timedelta
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from jose import JWTError

from app.security.jwt_tok import decode_token
from app.services.authentication_service import AuthenticationService
from app.core.config import settings

logger = logging.getLogger(__name__)


class TokenRotationMiddleware(BaseHTTPMiddleware):

    async def dispatch(self, request: Request, call_next):

        if self._is_excluded(request):
            return await call_next(request)

        access_token = self._get_access_token(request)
        new_tokens = None

        if access_token:
            try:
                payload = decode_token(access_token)  # sync — no await needed

                if self._should_rotate(payload):
                    new_tokens = await self._rotate_tokens(request, payload)

            except JWTError as e:
                logger.warning(f"[JWT ERROR] {e}")
            except Exception as e:
                logger.error(f"[UNEXPECTED ERROR] {e}")

        response = await call_next(request)

        if new_tokens:
            self._attach_tokens(response, new_tokens)

        return response

    # -----------------------------
    # 🔹 Core Logic
    # -----------------------------

    def _is_excluded(self, request: Request) -> bool:
        return (
            request.method == "OPTIONS"
            or request.url.path in settings.EXCLUDED_PATHS
        )

    def _get_access_token(self, request: Request):
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            return auth_header.split(" ")[1]
        return request.cookies.get("access_token")

    def _should_rotate(self, payload: dict) -> bool:
        exp = payload.get("exp")
        if not exp:
            return False

        exp_time = datetime.fromtimestamp(exp, tz=timezone.utc)
        now = datetime.now(tz=timezone.utc)

        # Rotate if < 5 minutes remaining
        return (exp_time - now).total_seconds() < settings.TOKEN_ROTATE_THRESHOLD

    async def _rotate_tokens(self, request: Request, payload: dict):
        refresh_token = request.cookies.get("refresh_token")
        if not refresh_token:
            return None

        try:
            # 🔐 Optional fingerprint validation
            self._validate_fingerprint(request, payload)

            new_tokens = await AuthenticationService.rotate_token(refresh_token)

            # 🔄 Sliding session (extend refresh lifetime)
            await AuthenticationService.extend_session(payload.get("sub"))

            return new_tokens

        except Exception as e:
            logger.warning(f"[ROTATION FAILED] {e}")
            return None

    # -----------------------------
    # 🔐 Security Enhancements
    # -----------------------------

    def _validate_fingerprint(self, request: Request, payload: dict):
        """
        Prevent token theft (optional but recommended)
        """
        request_ip = request.client.host
        token_ip = payload.get("ip")

        if settings.ENABLE_IP_BINDING:
            if token_ip and token_ip != request_ip:
                raise Exception("IP mismatch detected")

    # -----------------------------
    # 🍪 Response Handling
    # -----------------------------

    def _attach_tokens(self, response, tokens: dict):
        access_token = tokens["access_token"]
        refresh_token = tokens["refresh_token"]

        is_production = not settings.FRONTEND_URL.startswith("http://localhost")

        # Access token
        response.set_cookie(
            "access_token",
            access_token,
            httponly=True,
            secure=is_production,
            samesite="none" if is_production else "lax",
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )

        # Refresh token
        response.set_cookie(
            "refresh_token",
            refresh_token,
            httponly=True,
            secure=is_production,
            samesite="none" if is_production else "lax",
            max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )

        # Optional header for frontend
        response.headers["x-new-token"] = access_token

        self._expose_headers(response)

    def _expose_headers(self, response):
        existing = response.headers.get("Access-Control-Expose-Headers", "")

        if "x-new-token" not in existing.lower():
            response.headers["Access-Control-Expose-Headers"] = (
                f"{existing}, x-new-token" if existing else "x-new-token"
            )