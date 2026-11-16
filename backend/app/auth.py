from dataclasses import dataclass

from fastapi import Header, HTTPException, Request, status


@dataclass(frozen=True)
class CurrentUser:
    id: str
    email: str | None
    # Passed on to Supabase so row level security applies to everything we write.
    token: str


async def current_user(request: Request, authorization: str | None = Header(default=None)) -> CurrentUser:
    """Accepts the Supabase login token the app already has: `Authorization: Bearer <token>`."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign in required")

    token = authorization.split(" ", 1)[1].strip()
    user = await request.app.state.supabase.get_user(token)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired session")

    return CurrentUser(id=user["id"], email=user.get("email"), token=token)
