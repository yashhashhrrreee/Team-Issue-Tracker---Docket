"""Testing.md item 21: every timestamp in every API response ends with
Z. Checked across several different serializers (issue, activity log,
comments, notifications) — confirming one doesn't prove they all route
through the shared iso() helper.
"""
from werkzeug.security import generate_password_hash

from app.extensions import db
from app.models import ProjectMembership, Role, User

from .conftest import csrf_header

TIMESTAMP_FIELDS = {"created_at", "updated_at", "closed_at", "joined_at", "expires_at"}


def _assert_all_timestamps_have_z(obj, path=""):
    """Recursively walk a JSON-decoded response and assert that every
    value under a known timestamp field key ends with Z."""
    if isinstance(obj, dict):
        for key, value in obj.items():
            key_path = f"{path}.{key}" if path else key
            if key in TIMESTAMP_FIELDS and value is not None:
                assert value.endswith("Z"), f"{key_path} = {value!r} missing UTC 'Z' suffix"
            else:
                _assert_all_timestamps_have_z(value, key_path)
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            _assert_all_timestamps_have_z(item, f"{path}[{i}]")


def _login(client, username):
    resp = client.post("/api/auth/login", json={"username": username, "password": "password123"})
    assert resp.status_code == 200


def test_every_timestamp_ends_with_z(client, base_fixtures):
    _login(client, "alice")
    project_id = base_fixtures["project_id"]

    # issue detail (issue fields + activity log)
    create = client.post(
        f"/api/projects/{project_id}/issues",
        json={"title": "Z-check", "description": "d", "category": "Decision", "priority": "Low"},
        headers=csrf_header(client),
    )
    assert create.status_code == 201
    issue_id = create.get_json()["id"]

    client.post(
        f"/api/issues/{issue_id}/comments", json={"body": "a comment"}, headers=csrf_header(client)
    )

    detail = client.get(f"/api/issues/{issue_id}")
    assert detail.status_code == 200
    body = detail.get_json()
    assert len(body["activity"]) >= 1
    assert len(body["comments"]) >= 1
    _assert_all_timestamps_have_z(body)

    # activity endpoint (its own route, separate serializer call site)
    activity = client.get(f"/api/issues/{issue_id}/activity")
    assert activity.status_code == 200
    assert len(activity.get_json()) >= 1
    _assert_all_timestamps_have_z(activity.get_json())

    # notifications — created_at on a NOTIFICATION row (Decision-category
    # trigger fired on the create above, since alice is Owner though —
    # add a Leader so there's at least one notification to check)
    leader = User(username="zoe", email="zoe@example.com", password_hash=generate_password_hash("password123"))
    db.session.add(leader)
    db.session.flush()
    db.session.add(ProjectMembership(user_id=leader.id, project_id=project_id, role=Role.LEADER))
    db.session.commit()

    client.post(
        f"/api/projects/{project_id}/issues",
        json={"title": "Z-check-2", "description": "d", "category": "Decision", "priority": "Low"},
        headers=csrf_header(client),
    )

    _login(client, "zoe")
    notifications = client.get("/api/notifications")
    assert notifications.status_code == 200
    assert len(notifications.get_json()) >= 1
    _assert_all_timestamps_have_z(notifications.get_json())

    # project list/detail (created_at on PROJECT)
    project_detail = client.get(f"/api/projects/{project_id}")
    assert project_detail.status_code == 200
    _assert_all_timestamps_have_z(project_detail.get_json())
