from fastapi import Request, HTTPException

# ── Helpers ──────────────────────────────────────────────────────────────────

def _get_user(request: Request) -> dict:
    """Return the decoded JWT payload attached by AuthMiddleware."""
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


# ── Role validators ───────────────────────────────────────────────────────────

async def validating_admin_role(request: Request) -> bool:
    user = _get_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return True


async def validating_student_role(request: Request) -> bool:
    user = _get_user(request)
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Student access required")
    return True


async def validating_teacher_role(request: Request) -> bool:
    user = _get_user(request)
    if user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Teacher access required")
    return True


async def validating_parent_role(request: Request) -> bool:
    user = _get_user(request)
    if user.get("role") != "parent":
        raise HTTPException(status_code=403, detail="Parent access required")
    return True


async def validating_staff_role(request: Request) -> bool:
    """Accepts hr | manager | sales | teacher roles."""
    user = _get_user(request)
    STAFF_ROLES = {"hr", "manager", "sales", "teacher"}
    if user.get("role") not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Staff access required")
    return True


async def validating_portal_access(request: Request) -> bool:
    """Any authenticated user can access the portal (student, parent, staff)."""
    _get_user(request)
    return True
