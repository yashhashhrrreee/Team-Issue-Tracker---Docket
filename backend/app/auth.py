from flask import Blueprint, current_app, jsonify, request
from flask_login import current_user, login_required, login_user, logout_user
from marshmallow import Schema, ValidationError, fields, validate
from werkzeug.security import check_password_hash, generate_password_hash

from .csrf import clear_csrf_cookie, generate_csrf_token, set_csrf_cookie
from .errors import ApiError
from .extensions import db, limiter
from .models import User

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


class RegisterSchema(Schema):
    username = fields.Str(required=True, validate=validate.Length(min=1, max=80))
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=8, max=128))


class LoginSchema(Schema):
    username = fields.Str(required=True)
    password = fields.Str(required=True)


def _user_to_dict(user):
    return {"id": user.id, "username": user.username, "email": user.email}


def _login_rate_limit_key():
    body = request.get_json(silent=True) or {}
    return f"{request.remote_addr}:{body.get('username', '')}"


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
