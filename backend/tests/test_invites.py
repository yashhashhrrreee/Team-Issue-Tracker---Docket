"""Invite accept — three distinct failure modes (Testing.md items 8, 9, 10),
kept as three separate tests rather than one generic "invalid invite" case,
per explicit instruction: token+email mismatch, replay of an already-accepted
invite, and expiry are different failure modes and deserve different tests.
"""
from datetime import datetime, timedelta

from app.extensions import db
from app.models import Invite, InviteStatus, Role

from .conftest import csrf_header


def _create_invite(client, project_id, email="dave@example.com", role=Role.DEVELOPER):
    resp = client.post(
        f"/api/projects/{project_id}/invites",
        json={"email": email, "role": role},
        headers=csrf_header(client),
    )
    assert resp.status_code == 201, resp.get_json()
    return resp.get_json()


def _login(client, username):
    resp = client.post("/api/auth/login", json={"username": username, "password": "password123"})
    assert resp.status_code == 200


# Testing.md #8: token+email must match together — all three mismatch
# combinations return the same 400 invalid_invite, not a distinguishing error.
def test_accept_rejects_wrong_email_wrong_token_and_both_wrong(client, base_fixtures, user_factory):
    _login(client, "alice")
    invite = _create_invite(client, base_fixtures["project_id"], email="dave@example.com")

    user_factory("dave", "dave@example.com")  # registers + logs dave in

    wrong_email = client.post(
        "/api/invites/accept",
        json={"token": invite["token"], "email": "wrong@example.com"},
        headers=csrf_header(client),
    )
    wrong_token = client.post(
        "/api/invites/accept",
        json={"token": "not-a-real-token", "email": "dave@example.com"},
        headers=csrf_header(client),
    )
    both_wrong = client.post(
        "/api/invites/accept",
        json={"token": "not-a-real-token", "email": "wrong@example.com"},
        headers=csrf_header(client),
    )

    for resp in (wrong_email, wrong_token, both_wrong):
        assert resp.status_code == 400
        assert resp.get_json()["error"]["code"] == "invalid_invite"


# Testing.md #9: single-use — accepting an already-Accepted invite is rejected,
# distinct from a token/email mismatch.
def test_accept_rejects_already_accepted_invite(client, base_fixtures, user_factory):
    _login(client, "alice")
    invite = _create_invite(client, base_fixtures["project_id"], email="dave@example.com")

    user_factory("dave", "dave@example.com")
    first = client.post(
        "/api/invites/accept",
        json={"token": invite["token"], "email": "dave@example.com"},
        headers=csrf_header(client),
    )
    assert first.status_code == 200

    replay = client.post(
        "/api/invites/accept",
        json={"token": invite["token"], "email": "dave@example.com"},
        headers=csrf_header(client),
    )
    assert replay.status_code == 400
    assert replay.get_json()["error"]["code"] == "invalid_invite"


# Testing.md #10: expiry — an invite past its expires_at is rejected even
# with a correct token+email pair. Distinct from mismatch and replay.
def test_accept_rejects_expired_invite_with_correct_token_and_email(
    app, client, base_fixtures, user_factory
):
    _login(client, "alice")
    invite_data = _create_invite(client, base_fixtures["project_id"], email="dave@example.com")

    with app.app_context():
        invite = db.session.get(Invite, invite_data["id"])
        invite.expires_at = datetime.utcnow() - timedelta(days=1)
        assert invite.status == InviteStatus.PENDING  # still pending, only expiry is the problem
        db.session.commit()

    user_factory("dave", "dave@example.com")
    resp = client.post(
        "/api/invites/accept",
        json={"token": invite_data["token"], "email": "dave@example.com"},
        headers=csrf_header(client),
    )
    assert resp.status_code == 400
    assert resp.get_json()["error"]["code"] == "invalid_invite"


def test_accept_succeeds_with_correct_token_and_email(client, base_fixtures, user_factory):
    _login(client, "alice")
    invite = _create_invite(client, base_fixtures["project_id"], email="dave@example.com", role=Role.LEADER)

    user_factory("dave", "dave@example.com")
    resp = client.post(
        "/api/invites/accept",
        json={"token": invite["token"], "email": "dave@example.com"},
        headers=csrf_header(client),
    )
    assert resp.status_code == 200
    assert resp.get_json()["role"] == Role.LEADER
