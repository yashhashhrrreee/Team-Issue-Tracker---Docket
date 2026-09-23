import secrets
from datetime import datetime, timedelta

from flask import Blueprint, current_app, jsonify, request
from flask_login import current_user, login_required, login_user, logout_user
from marshmallow import Schema, ValidationError, fields, validate
from werkzeug.security import check_password_hash, generate_password_hash

from .csrf import clear_csrf_cookie, generate_csrf_token, set_csrf_cookie
from .errors import ApiError
from .extensions import db, limiter
from .models import PasswordResetStatus, PasswordResetToken, User

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

RESET_TOKEN_TTL = timedelta(hours=1)


class RegisterSchema(Schema):
    username = fields.Str(required=True, validate=validate.Length(min=1, max=80))
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=8, max=128))


class LoginSchema(Schema):
    username = fields.Str(required=True)
    password = fields.Str(required=True)


class ChangePasswordSchema(Schema):
    current_password = fields.Str(required=True)
    new_password = fields.Str(required=True, validate=validate.Length(min=8, max=128))


class ForgotPasswordSchema(Schema):
    email = fields.Email(required=True)


class ResetPasswordSchema(Schema):
    token = fields.Str(required=True)
    new_password = fields.Str(required=True, validate=validate.Length(min=8, max=128))


def _user_to_dict(user):
    return {"id": user.id, "username": user.username, "email": user.email}


def _login_rate_limit_key():
    body = request.get_json(silent=True) or {}
    return f"{request.remote_addr}:{body.get('username', '')}"


def _forgot_password_rate_limit_key():
    body = request.get_json(silent=True) or {}
    return f"{request.remote_addr}:{body.get('email', '')}"


def _reset_password_rate_limit_key():
    # Keyed on IP alone, not the token — an attacker brute-forcing reset
    # tokens rotates the token on every attempt, so keying on it would
    # let them bypass the limit entirely by trying a fresh token each time.
    return request.remote_addr


def _change_password_rate_limit_key():
    return f"{request.remote_addr}:{current_user.get_id()}"


def _cookie_flags():
    is_prod = current_app.config.get("FLASK_ENV") == "production"
    return {"secure": is_prod, "samesite": "None" if is_prod else "Lax"}


@auth_bp.post("/register")
@limiter.limit("10 per minute", key_func=_login_rate_limit_key)
def register():
    try:
        data = RegisterSchema().load(request.get_json(silent=True) or {})
    except ValidationError as err:
        raise ApiError("invalid_request", str(err.messages), 400)

    if User.query.filter_by(username=data["username"]).first() is not None:
        raise ApiError("username_taken", "That username is already taken.", 409)
    if User.query.filter_by(email=data["email"]).first() is not None:
        raise ApiError("email_taken", "That email is already registered.", 409)

    user = User(
        username=data["username"],
        email=data["email"],
        password_hash=generate_password_hash(data["password"]),
    )
    db.session.add(user)
    db.session.commit()

    login_user(user)
    response = jsonify(_user_to_dict(user))
    response.status_code = 201
    set_csrf_cookie(response, generate_csrf_token(), **_cookie_flags())
    return response


@auth_bp.post("/login")
@limiter.limit("10 per minute", key_func=_login_rate_limit_key)
def login():
    try:
        data = LoginSchema().load(request.get_json(silent=True) or {})
    except ValidationError as err:
        raise ApiError("invalid_request", str(err.messages), 400)

    user = User.query.filter_by(username=data["username"]).first()
    if user is None or not check_password_hash(user.password_hash, data["password"]):
        # Security.md/Testing.md: identical error for unknown user vs
        # wrong password, so login can't be used to enumerate usernames.
        raise ApiError("invalid_credentials", "Incorrect username or password.", 401)

    login_user(user)
    response = jsonify(_user_to_dict(user))
    set_csrf_cookie(response, generate_csrf_token(), **_cookie_flags())
    return response


@auth_bp.post("/logout")
@login_required
def logout():
    logout_user()
    response = jsonify({"ok": True})
    clear_csrf_cookie(response, **_cookie_flags())
    return response


@auth_bp.get("/me")
@login_required
def me():
    return jsonify(_user_to_dict(current_user))


@auth_bp.post("/password")
@login_required
@limiter.limit("10 per minute", key_func=_change_password_rate_limit_key)
def change_password():
    try:
        data = ChangePasswordSchema().load(request.get_json(silent=True) or {})
    except ValidationError as err:
        raise ApiError("invalid_request", str(err.messages), 400)

    # Security.md §2: being logged in isn't sufficient on its own — a
    # hijacked/CSRF-adjacent session shouldn't be able to silently
    # rotate the password without knowing the current one.
    if not check_password_hash(current_user.password_hash, data["current_password"]):
        raise ApiError("invalid_credentials", "Current password is incorrect.", 400)

    current_user.password_hash = generate_password_hash(data["new_password"])
    db.session.commit()
    return jsonify({"ok": True})


@auth_bp.post("/forgot-password")
@limiter.limit("10 per minute", key_func=_forgot_password_rate_limit_key)
def forgot_password():
    try:
        data = ForgotPasswordSchema().load(request.get_json(silent=True) or {})
    except ValidationError as err:
        raise ApiError("invalid_request", str(err.messages), 400)

    # Security.md §2: identical response whether or not the email
    # exists — the token is only actually created behind the scenes.
    user = User.query.filter_by(email=data["email"]).first()
    if user is not None:
        token = PasswordResetToken(
            user_id=user.id,
            token=secrets.token_urlsafe(32),
            status=PasswordResetStatus.PENDING,
            expires_at=datetime.utcnow() + RESET_TOKEN_TTL,
        )
        db.session.add(token)
        db.session.commit()
        # No email service exists yet (Backend.md §9's invite dev-mode
        # workaround, same pattern here) — log it so the flow is testable.
        # .warning(), not .info(): Flask's default logger level is
        # WARNING outside debug mode, so .info() here would silently
        # never appear in the dev server's own console — found by
        # actually trying to read it back during manual verification.
        current_app.logger.warning(
            "Password reset token for %s: %s", user.email, token.token
        )

    return jsonify(
        {"message": "If that email is registered, we've sent a reset link."}
    )


@auth_bp.post("/reset-password")
@limiter.limit("10 per minute", key_func=_reset_password_rate_limit_key)
def reset_password():
    try:
        data = ResetPasswordSchema().load(request.get_json(silent=True) or {})
    except ValidationError as err:
        raise ApiError("invalid_request", str(err.messages), 400)

    invalid = ApiError(
        "invalid_reset_token", "This reset link is invalid or has expired.", 400
    )

    reset_token = PasswordResetToken.query.filter_by(token=data["token"]).first()
    if reset_token is None:
        raise invalid
    if reset_token.status != PasswordResetStatus.PENDING:
        raise invalid
    if reset_token.expires_at < datetime.utcnow():
        raise invalid

    user = db.session.get(User, reset_token.user_id)
    user.password_hash = generate_password_hash(data["new_password"])
    reset_token.status = PasswordResetStatus.USED
    db.session.commit()
    return jsonify({"ok": True})
