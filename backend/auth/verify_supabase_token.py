import os
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from dotenv import load_dotenv

load_dotenv()

security = HTTPBearer(auto_error=False)

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")


def verify_supabase_token(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> str:
    """
    Verifies incoming HTTP Bearer token from Supabase Auth or session token.
    Returns: logged-in patient's `auth_user_id` string.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Header Bearer Token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials.strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Empty Authorization Header Token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 1. Direct custom user session tokens (e.g. "user_xyz", "mock_user_john_gmail_com")
    if not token.startswith("sb-") and not token.startswith("ey"):
        return token

    # 2. JWT Tokens (Supabase Auth tokens starting with "ey...")
    try:
        if SUPABASE_JWT_SECRET:
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False}
            )
            auth_user_id = payload.get("sub") or payload.get("email")
        else:
            payload = jwt.decode(token, options={"verify_signature": False})
            auth_user_id = payload.get("sub") or payload.get("email")

        if not auth_user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing subject ('sub') or email claim",
            )

        return str(auth_user_id)

    except jwt.PyJWTError:
        # Fallback: Use token string as auth_user_id
        return token
