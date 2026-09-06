import secrets

from flask import request

from .errors import ApiError

CSRF_COOKIE_NAME = "csrf_token"
CSRF_HEADER_NAME = "X-CSRF-Token"

# Security.md §4: double-submit cookie. Register/login are exempt because
# the csrf_token cookie is only set *on* login — there's no session yet
# for a forged request to ride on beforehand.
_CSRF_EXEMPT_PATHS = {"/api/auth/register", "/api/auth/login"}


def generate_csrf_token():
    return secrets.token_urlsafe(32)


def set_csrf_cookie(response, token, secure, samesite):
    response.set_cookie(
        CSRF_COOKIE_NAME,
        token,
        httponly=False,
        secure=secure,
        samesite=samesite,
        path="/",
    )
    return response


def clear_csrf_cookie(response, secure, samesite):
    response.delete_cookie(CSRF_COOKIE_NAME, path="/", secure=secure, samesite=samesite)
    return response


def enforce_csrf():
    if request.method not in ("POST", "PATCH", "DELETE"):
        return
    if request.path in _CSRF_EXEMPT_PATHS:
        return
    if not request.path.startswith("/api/"):
        return

    cookie_value = request.cookies.get(CSRF_COOKIE_NAME)
    header_value = request.headers.get(CSRF_HEADER_NAME)
    if not cookie_value or not header_value or cookie_value != header_value:
        raise ApiError("csrf_failed", "CSRF token missing or invalid.", 403)
