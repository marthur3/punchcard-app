"""Super-admin authentication — bcrypt password + session cookies.

Env vars
--------
SUPER_ADMIN_EMAIL          — your login email
SUPER_ADMIN_PASSWORD_HASH  — bcrypt hash of your password (generate with: python -c "import bcrypt; print(bcrypt.hashpw(b'yourpass', bcrypt.gensalt()).decode())")
"""

import os
import secrets
from functools import wraps

import bcrypt
from flask import redirect, request, url_for

from db import P, commit, execute, get_db, uid

_COOKIE_NAME = "tapranked_admin"


def verify_password(plain: str) -> bool:
    """Check a plain-text password against the stored bcrypt hash."""
    stored = os.environ.get("SUPER_ADMIN_PASSWORD_HASH", "")
    if not stored:
        return False
    return bcrypt.checkpw(plain.encode(), stored.encode())


def create_session(db) -> str:
    """Create a new admin session and return the token."""
    token = secrets.token_urlsafe(48)
    execute(db, f"INSERT INTO admin_sessions (id, token) VALUES ({P},{P})", (uid(), token))
    commit(db)
    return token


def get_session_token() -> str | None:
    """Read the admin session token from the cookie."""
    return request.cookies.get(_COOKIE_NAME)


def is_authenticated() -> bool:
    """Check if the current request has a valid admin session."""
    token = get_session_token()
    if not token:
        return False
    db = get_db()
    row = execute(db, f"SELECT id FROM admin_sessions WHERE token = {P}", (token,)).fetchone()
    return row is not None


def require_admin(f):
    """Decorator — redirect to login if not authenticated."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not is_authenticated():
            return redirect(url_for("super_login"))
        return f(*args, **kwargs)
    return wrapper


def set_auth_cookie(response, token: str):
    """Set the session cookie on a response."""
    response.set_cookie(
        _COOKIE_NAME,
        token,
        httponly=True,
        secure=os.environ.get("ENFORCE_HTTPS", "").lower() == "true",
        samesite="Lax",
        max_age=60 * 60 * 24 * 30,  # 30 days
    )
    return response


def clear_auth_cookie(response):
    """Remove the session cookie."""
    response.delete_cookie(_COOKIE_NAME)
    return response
