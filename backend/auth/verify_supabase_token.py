import os
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from dotenv import load_dotenv

load_dotenv()

security = HTTPBearer(auto_error=False)

MOCK_AUTH = os.getenv("MOCK_AUTH", "true").lower() in ("true", "1", "yes")
DEFAULT_MOCK_USER_ID = os.getenv("DEFAULT_MOCK_USER_ID", "demo-patient-auth-id-123")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")


def verify_supabase_token(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> str:
    """
    Verifies incoming HTTP Bearer token from Supabase Auth.
    Returns: logged-in patient's `auth_user_id` string.
    """
    # If Mock Auth is active and no header passed, return default mock user ID
    if MOCK_AUTH and not credentials:
        return DEFAULT_MOCK_USER_ID

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Header Bearer Token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    # Allow mock tokens during dev
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
            # Fallback unverified decode for development if secret not set
            payload = jwt.decode(token, options={"verify_signature": False})
            auth_user_id = payload.get("sub")

        if not auth_user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing subject ('sub') claim",
            )

        return auth_user_id

    except jwt.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authorization token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
