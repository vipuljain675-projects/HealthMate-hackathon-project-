import os
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from dotenv import load_dotenv

load_dotenv()

security = HTTPBearer(auto_error=False)

MOCK_AUTH = os.getenv("MOCK_AUTH", "true").lower() in ("true", "1", "yes")
DEFAULT_MOCK_USER_ID = os.getenv("DEFAULT_MOCK_USER_ID", "mock_user_vipuljain675_gmail_com")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")


def verify_supabase_token(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> str:
    """
    Verifies incoming HTTP Bearer token from Supabase Auth or mock user session.
    Returns: logged-in patient's `auth_user_id` string.
    """
    if credentials and credentials.credentials:
        token = credentials.credentials.strip()
        # If token is passed e.g. "user_session_xyz"
        if token and token != "mock_token_dev" and not token.startswith("sb-"):
            return token

    if MOCK_AUTH and not credentials:
        return DEFAULT_MOCK_USER_ID

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Header Bearer Token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    if MOCK_AUTH and token.startswith("mock_token"):
        return DEFAULT_MOCK_USER_ID

    try:
        if SUPABASE_JWT_SECRET:
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False}
            )
            auth_user_id = payload.get("sub")
        else:
            payload = jwt.decode(token, options={"verify_signature": False})
            auth_user_id = payload.get("sub")

        if not auth_user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing subject ('sub') claim",
            )

        return auth_user_id

    except jwt.PyJWTError as e:
        # Fall back to token as auth_user_id in dev mode
        if MOCK_AUTH and token:
            return token
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authorization token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
