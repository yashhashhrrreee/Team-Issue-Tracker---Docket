"""Testing.md #23-26 — password change and forgot/reset-password flows.

Password change is a bug fix (the endpoint never existed); forgot/reset
password is new scope discovered during manual testing, not something
either doc or code originally covered. See Decisions.md.
"""
from datetime import datetime, timedelta

from app.extensions import db
from app.models import PasswordResetStatus, PasswordResetToken, User

from .conftest import csrf_header


# Regression guard: csrf.py's _CSRF_EXEMPT_PATHS is an exact-match set
# containing only /api/auth/register, /api/auth/login,
# /api/auth/forgot-password, and /api/auth/reset-password — NOT a
# prefix match on /api/auth/*. /api/auth/password is a session-authenticated
# action (unlike the four exempt paths, all reachable while signed out
# with no csrf_token cookie yet) and must stay CSRF-checked. This test
# exists specifically to catch a future refactor of the exemption check
# into something prefix-based, which would silently also exempt this
# endpoint and defeat CSRF protection on it.
def test_change_password_requires_csrf_token_even_with_valid_session(client, user_factory):
    user_factory("alice")
    resp = client.post(
        "/api/auth/password",
        json={"current_password": "password123", "new_password": "newpassword123"},
        # deliberately no csrf_header(client) — a valid session alone
        # must not be enough
    )
    assert resp.status_code == 403
    assert resp.get_json()["error"]["code"] == "csrf_failed"


# Testing.md #23: current_password is required and verified — being
# logged in is not sufficient on its own to change the password.
def test_change_password_rejects_incorrect_current_password(client, user_factory):
    user_factory("alice")
    resp = client.post(
        "/api/auth/password",
        json={"current_password": "wrong-password", "new_password": "newpassword123"},
        headers=csrf_header(client),
    )
    assert resp.status_code == 400
    assert resp.get_json()["error"]["code"] == "invalid_credentials"


def test_change_password_succeeds_and_new_password_works_for_login(client, user_factory):
    user_factory("alice")
    resp = client.post(
        "/api/auth/password",
        json={"current_password": "password123", "new_password": "newpassword123"},
        headers=csrf_header(client),
    )
    assert resp.status_code == 200

    client.post("/api/auth/logout", headers=csrf_header(client))

    old_password_login = client.post(
        "/api/auth/login", json={"username": "alice", "password": "password123"}
    )
    assert old_password_login.status_code == 401

    new_password_login = client.post(
        "/api/auth/login", json={"username": "alice", "password": "newpassword123"}
    )
    assert new_password_login.status_code == 200


# Testing.md #24: identical response whether or not the email exists —
# same enumeration-prevention principle as the login test.
def test_forgot_password_returns_identical_response_for_real_and_fake_email(client, user_factory):
    user_factory("alice")

    real = client.post("/api/auth/forgot-password", json={"email": "alice@example.com"})
    fake = client.post("/api/auth/forgot-password", json={"email": "nobody@example.com"})

    assert real.status_code == fake.status_code == 200
    assert real.get_json() == fake.get_json()


def test_forgot_password_only_creates_a_token_for_a_real_email(app, client, user_factory):
    user_factory("alice")

    client.post("/api/auth/forgot-password", json={"email": "alice@example.com"})
    client.post("/api/auth/forgot-password", json={"email": "nobody@example.com"})

    with app.app_context():
        tokens = PasswordResetToken.query.all()
        assert len(tokens) == 1
        user = db.session.get(User, tokens[0].user_id)
        assert user.email == "alice@example.com"


# Testing.md #25 (part 1 of 3): single-use — a second attempt with an
# already-used token fails.
def test_reset_token_is_single_use(app, client, user_factory):
    user_factory("alice")
    client.post("/api/auth/forgot-password", json={"email": "alice@example.com"})
    with app.app_context():
        token = PasswordResetToken.query.first().token

    first = client.post(
        "/api/auth/reset-password",
        json={"token": token, "new_password": "newpassword123"},
        headers=csrf_header(client),
    )
    assert first.status_code == 200

    replay = client.post(
        "/api/auth/reset-password",
        json={"token": token, "new_password": "anotherpassword456"},
        headers=csrf_header(client),
    )
    assert replay.status_code == 400
    assert replay.get_json()["error"]["code"] == "invalid_reset_token"


# Testing.md #25 (part 2 of 3): an expired token fails even with the
# correct new password.
def test_reset_token_rejects_when_expired(app, client, user_factory):
    user_factory("alice")
    client.post("/api/auth/forgot-password", json={"email": "alice@example.com"})

    with app.app_context():
        reset_token = PasswordResetToken.query.first()
        token_value = reset_token.token
        reset_token.expires_at = datetime.utcnow() - timedelta(hours=1)
        assert reset_token.status == PasswordResetStatus.PENDING  # only expiry is the problem
        db.session.commit()

    resp = client.post(
        "/api/auth/reset-password",
        json={"token": token_value, "new_password": "newpassword123"},
        headers=csrf_header(client),
    )
    assert resp.status_code == 400
    assert resp.get_json()["error"]["code"] == "invalid_reset_token"


# Testing.md #25 (part 3 of 3): the resulting new password actually
# works for a subsequent login, and the old one no longer does.
def test_reset_password_new_password_works_old_does_not(app, client, user_factory):
    user_factory("alice")
    client.post("/api/auth/forgot-password", json={"email": "alice@example.com"})
    with app.app_context():
        token = PasswordResetToken.query.first().token

    resp = client.post(
        "/api/auth/reset-password",
        json={"token": token, "new_password": "newpassword123"},
        headers=csrf_header(client),
    )
    assert resp.status_code == 200

    client.post("/api/auth/logout", headers=csrf_header(client))

    old = client.post("/api/auth/login", json={"username": "alice", "password": "password123"})
    assert old.status_code == 401

    new = client.post("/api/auth/login", json={"username": "alice", "password": "newpassword123"})
    assert new.status_code == 200


# Testing.md #26: reset-password never distinguishes *why* a token
# failed (never existed vs. expired vs. already used) — same generic
# error for all three.
def test_reset_password_error_is_generic_across_failure_reasons(app, client, user_factory):
    user_factory("alice")

    never_existed = client.post(
        "/api/auth/reset-password",
        json={"token": "not-a-real-token", "new_password": "newpassword123"},
        headers=csrf_header(client),
    )

    client.post("/api/auth/forgot-password", json={"email": "alice@example.com"})
    with app.app_context():
        expired_token = PasswordResetToken.query.first()
        expired_token.expires_at = datetime.utcnow() - timedelta(hours=1)
        db.session.commit()
        expired_value = expired_token.token

    expired = client.post(
        "/api/auth/reset-password",
        json={"token": expired_value, "new_password": "newpassword123"},
        headers=csrf_header(client),
    )

    client.post("/api/auth/forgot-password", json={"email": "alice@example.com"})
    with app.app_context():
        used_token = (
            PasswordResetToken.query.filter_by(status=PasswordResetStatus.PENDING)
            .order_by(PasswordResetToken.created_at.desc())
            .first()
        )
        used_value = used_token.token
    client.post(
        "/api/auth/reset-password",
        json={"token": used_value, "new_password": "newpassword123"},
        headers=csrf_header(client),
    )
    already_used = client.post(
        "/api/auth/reset-password",
        json={"token": used_value, "new_password": "anotherpassword456"},
        headers=csrf_header(client),
    )

    for resp in (never_existed, expired, already_used):
        assert resp.status_code == 400
        body = resp.get_json()
        assert body["error"]["code"] == "invalid_reset_token"
        assert body["error"]["message"] == "This reset link is invalid or has expired."

    assert never_existed.get_json() == expired.get_json() == already_used.get_json()
