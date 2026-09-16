"""Security.md — access control and injection defenses.

Membership-gate coverage is parametrized across every project-scoped and
issue-scoped route that goes through get_membership_or_404 — 18 routes.
This is deliberately NOT every route in the API: /api/auth/*, POST
/api/projects (create), GET /api/projects (list-my-own), POST
/api/invites/accept, and /api/notifications/* are excluded, matching
Security.md §3's own carve-outs (creation/accept are pre-membership by
definition; notifications are filtered by user_id, not project_id, so
there's no project-scoped ID to gate on).
"""
import pytest

from .conftest import csrf_header

GATED_ROUTES = [
    ("GET", "/api/projects/{project_id}"),
    ("PATCH", "/api/projects/{project_id}"),
    ("PATCH", "/api/projects/{project_id}/membership"),
    ("POST", "/api/projects/{project_id}/invites"),
    ("GET", "/api/projects/{project_id}/invites"),
    ("GET", "/api/projects/{project_id}/issues"),
    ("POST", "/api/projects/{project_id}/issues"),
    ("GET", "/api/projects/{project_id}/members"),
    ("GET", "/api/projects/{project_id}/members/{alice_id}"),
    ("GET", "/api/projects/{project_id}/folders"),
    ("POST", "/api/projects/{project_id}/folders"),
    ("POST", "/api/projects/{project_id}/resources"),
    ("GET", "/api/issues/{issue_id}"),
    ("PATCH", "/api/issues/{issue_id}"),
    ("POST", "/api/issues/{issue_id}/status"),
    ("DELETE", "/api/issues/{issue_id}"),
    ("GET", "/api/issues/{issue_id}/activity"),
    ("POST", "/api/issues/{issue_id}/comments"),
]


def _login(client, username):
    resp = client.post("/api/auth/login", json={"username": username, "password": "password123"})
    assert resp.status_code == 200


@pytest.mark.parametrize("method,path_template", GATED_ROUTES)
def test_membership_gate_returns_404_for_non_member(client, base_fixtures, user_factory, method, path_template):
    user_factory("mallory")  # registers + logs in an outsider with no membership anywhere
    path = path_template.format(**base_fixtures)

    resp = client.open(path, method=method, json={}, headers=csrf_header(client))

    assert resp.status_code == 404, f"{method} {path} -> {resp.status_code}: {resp.get_json()}"
    assert resp.get_json()["error"]["code"] == "not_found"


def test_csrf_blocks_state_changing_request_without_token(client, base_fixtures, user_factory):
    user_factory("erin")
    resp = client.post(f"/api/projects/{base_fixtures['project_id']}/folders", json={"name": "Docs"})
    assert resp.status_code == 403
    assert resp.get_json()["error"]["code"] == "csrf_failed"


def test_csrf_does_not_block_get_requests(client, user_factory):
    user_factory("erin2")
    resp = client.get("/api/auth/me")
    assert resp.status_code == 200


def test_login_error_identical_for_unknown_user_and_wrong_password(client, base_fixtures):
    wrong_password = client.post(
        "/api/auth/login", json={"username": "alice", "password": "not-the-password"}
    )
    unknown_user = client.post(
        "/api/auth/login", json={"username": "nobody-such-user", "password": "irrelevant"}
    )
    assert wrong_password.status_code == unknown_user.status_code == 401
    assert (
        wrong_password.get_json()["error"]["message"]
        == unknown_user.get_json()["error"]["message"]
    )


def test_password_never_returned_in_me_or_roster(client, base_fixtures):
    _login(client, "alice")
    me = client.get("/api/auth/me")
    assert "password" not in me.get_json()
    assert "password_hash" not in me.get_json()

    roster = client.get(f"/api/projects/{base_fixtures['project_id']}/members")
    for member in roster.get_json():
        assert "password" not in member
        assert "password_hash" not in member


def test_invalid_enum_value_rejected_on_issue_create(client, base_fixtures):
    _login(client, "alice")
    resp = client.post(
        f"/api/projects/{base_fixtures['project_id']}/issues",
        json={
            "title": "Bad category",
            "description": "x",
            "category": "Foo",
            "priority": "Medium",
        },
        headers=csrf_header(client),
    )
    assert resp.status_code == 400


def test_invite_list_never_returns_token(client, base_fixtures):
    _login(client, "alice")
    project_id = base_fixtures["project_id"]

    created = client.post(
        f"/api/projects/{project_id}/invites",
        json={"email": "frank@example.com", "role": "Developer"},
        headers=csrf_header(client),
    )
    assert created.status_code == 201
    assert "token" in created.get_json()  # the creator still gets it once, at creation

    listed = client.get(f"/api/projects/{project_id}/invites")
    assert listed.status_code == 200
    invites = listed.get_json()
    assert len(invites) >= 1
    for invite in invites:
        assert "token" not in invite, f"token field present in list response: {invite}"
        assert invite["email"] == "frank@example.com"


def test_injection_style_title_stored_as_inert_literal(app, client, base_fixtures):
    _login(client, "alice")
    payload = "'; DROP TABLE issue; --"
    resp = client.post(
        f"/api/projects/{base_fixtures['project_id']}/issues",
        json={"title": payload, "description": "x", "category": "Technical", "priority": "Low"},
        headers=csrf_header(client),
    )
    assert resp.status_code == 201
    issue_id = resp.get_json()["id"]

    fetched = client.get(f"/api/issues/{issue_id}")
    assert fetched.status_code == 200
    assert fetched.get_json()["title"] == payload

    with app.app_context():
        # table still exists and is queryable — nothing was executed
        from app.models import Issue

        assert Issue.query.count() >= 1
