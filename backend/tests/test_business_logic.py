"""Backend.md §5 — business logic that must live server-side.

One test per numbered rule in Backend.md §5, matching Testing.md §2's
"From Backend.md §5" list (items 1-12), plus an explicit rule 8 test
added on top: PATCH /issues/:id must not be able to move status,
closing the exact bypass caught during Phase 3 review.
"""
from app.extensions import db
from app.models import ActivityLog, Issue, IssueStatus, Notification, ProjectMembership, Role

from .conftest import csrf_header


def _create_issue(client, project_id, **overrides):
    body = {
        "title": "A new ticket",
        "description": "Something needs doing.",
        "category": "Technical",
        "priority": "Medium",
    }
    body.update(overrides)
    resp = client.post(f"/api/projects/{project_id}/issues", json=body, headers=csrf_header(client))
    assert resp.status_code == 201, resp.get_json()
    return resp.get_json()


# 1. Issue create writes an issue_created ACTIVITY_LOG row with the full baseline.
def test_create_writes_issue_created_activity_row(app, client, base_fixtures):
    login_as(client, "alice")
    issue = _create_issue(client, base_fixtures["project_id"])

    with app.app_context():
        rows = ActivityLog.query.filter_by(issue_id=issue["id"]).all()
        assert len(rows) == 1
        assert rows[0].event_type == "issue_created"
        assert rows[0].meta["title"] == "A new ticket"
        assert rows[0].meta["status"] == "Open"


# 2. Update writes exactly one field_updated row per changed field, none for unchanged fields.
def test_update_writes_one_row_per_changed_field_only(app, client, base_fixtures):
    login_as(client, "alice")
    issue = _create_issue(client, base_fixtures["project_id"], priority="Low")

    resp = client.patch(
        f"/api/issues/{issue['id']}",
        json={"title": "Renamed", "priority": "Low"},  # priority unchanged on purpose
        headers=csrf_header(client),
    )
    assert resp.status_code == 200

    with app.app_context():
        updates = ActivityLog.query.filter_by(issue_id=issue["id"], event_type="field_updated").all()
        assert len(updates) == 1
        assert updates[0].meta["field"] == "title"


# 3. Moving to Done without resolution_note returns 400.
def test_close_without_resolution_note_returns_400(client, base_fixtures):
    login_as(client, "alice")
    issue = _create_issue(client, base_fixtures["project_id"])

    resp = client.post(
        f"/api/issues/{issue['id']}/status", json={"status": "Done"}, headers=csrf_header(client)
    )
    assert resp.status_code == 400
    assert resp.get_json()["error"]["code"] == "resolution_note_required"


# 4. Moving to Done with resolution_note succeeds and the note is stored.
def test_close_with_resolution_note_succeeds_and_is_stored(client, base_fixtures):
    login_as(client, "alice")
    issue = _create_issue(client, base_fixtures["project_id"])

    resp = client.post(
        f"/api/issues/{issue['id']}/status",
        json={"status": "Done", "resolution_note": "Fixed via config change."},
        headers=csrf_header(client),
    )
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "Done"
    assert resp.get_json()["resolution_note"] == "Fixed via config change."

    resp2 = client.get(f"/api/issues/{issue['id']}")
    assert resp2.get_json()["resolution_note"] == "Fixed via config change."


# 5. Decision-notification fires on create, for Leader/Manager only.
def test_decision_notification_fires_on_create_for_leader_manager_only(app, client, base_fixtures):
    with app.app_context():
        leader = _add_member(base_fixtures["project_id"], "leo", Role.LEADER)
        manager = _add_member(base_fixtures["project_id"], "mona", Role.MANAGER)

    login_as(client, "alice")
    issue = _create_issue(client, base_fixtures["project_id"], category="Decision")

    with app.app_context():
        recipient_ids = {
            n.user_id
            for n in Notification.query.filter_by(issue_id=issue["id"], type="decision_needed").all()
        }
        assert recipient_ids == {leader, manager}
        assert base_fixtures["alice_id"] not in recipient_ids  # Owner
        assert base_fixtures["bob_id"] not in recipient_ids  # Developer


# 6. Decision-notification fires on update when category changes TO Decision.
def test_decision_notification_fires_when_category_changes_to_decision(app, client, base_fixtures):
    with app.app_context():
        leader = _add_member(base_fixtures["project_id"], "leo2", Role.LEADER)

    login_as(client, "alice")
    issue = _create_issue(client, base_fixtures["project_id"], category="Technical")

    resp = client.patch(
        f"/api/issues/{issue['id']}", json={"category": "Decision"}, headers=csrf_header(client)
    )
    assert resp.status_code == 200

    with app.app_context():
        notes = Notification.query.filter_by(issue_id=issue["id"], type="decision_needed").all()
        assert {n.user_id for n in notes} == {leader}


# 7. Decision-notification does NOT re-fire on an unrelated edit to an already-Decision issue.
def test_decision_notification_does_not_refire_on_unrelated_edit(app, client, base_fixtures):
    with app.app_context():
        _add_member(base_fixtures["project_id"], "leo3", Role.LEADER)

    login_as(client, "alice")
    issue = _create_issue(client, base_fixtures["project_id"], category="Decision")

    resp = client.patch(
        f"/api/issues/{issue['id']}", json={"title": "Edited title only"}, headers=csrf_header(client)
    )
    assert resp.status_code == 200

    with app.app_context():
        notes = Notification.query.filter_by(issue_id=issue["id"], type="decision_needed").all()
        assert len(notes) == 1  # only the original create-time notification


# 8. PATCH /issues/:id cannot move status — only POST /status can. Closes the
# exact bypass of rule 2 that a permissive PATCH would allow.
def test_patch_cannot_change_status(app, client, base_fixtures):
    login_as(client, "alice")
    issue = _create_issue(client, base_fixtures["project_id"])

    resp = client.patch(
        f"/api/issues/{issue['id']}", json={"status": "Done"}, headers=csrf_header(client)
    )
    assert resp.status_code == 400  # schema rejects the unknown/disallowed field

    with app.app_context():
        stored = db.session.get(Issue, issue["id"])
        assert stored.status == IssueStatus.OPEN
        # and critically: no Done transition slipped through without a resolution_note
        assert stored.resolution_note is None


# 11. (owner_id, key) uniqueness: same owner + existing key -> 409; different owner, same key -> succeeds.
def test_project_key_unique_per_owner_not_globally(client, base_fixtures):
    login_as(client, "alice")
    resp = client.post("/api/projects", json={"name": "Dup", "key": "ROC"}, headers=csrf_header(client))
    assert resp.status_code == 409

    login_as(client, "bob")
    resp2 = client.post(
        "/api/projects", json={"name": "Bob's ROC", "key": "ROC"}, headers=csrf_header(client)
    )
    assert resp2.status_code == 201


# 12. Board view preference is scoped per user per project.
def test_board_view_preference_scoped_per_user_per_project(app, client, base_fixtures):
    login_as(client, "alice")
    resp = client.patch(
        f"/api/projects/{base_fixtures['project_id']}/membership",
        json={"board_view_preference": "swimlane"},
        headers=csrf_header(client),
    )
    assert resp.status_code == 200

    login_as(client, "bob")
    bob_pref = client.patch(
        f"/api/projects/{base_fixtures['project_id']}/membership",
        json={"board_view_preference": "tag"},
        headers=csrf_header(client),
    )
    assert bob_pref.status_code == 200

    with app.app_context():
        alice_m = ProjectMembership.query.filter_by(
            project_id=base_fixtures["project_id"], user_id=base_fixtures["alice_id"]
        ).first()
        bob_m = ProjectMembership.query.filter_by(
            project_id=base_fixtures["project_id"], user_id=base_fixtures["bob_id"]
        ).first()
        assert alice_m.board_view_preference == "swimlane"
        assert bob_m.board_view_preference == "tag"


def login_as(client, username):
    resp = client.post("/api/auth/login", json={"username": username, "password": "password123"})
    assert resp.status_code == 200, resp.get_json()


def _add_member(project_id, username, role):
    from werkzeug.security import generate_password_hash

    from app.models import User

    user = User(
        username=username,
        email=f"{username}@example.com",
        password_hash=generate_password_hash("password123"),
    )
    db.session.add(user)
    db.session.flush()
    db.session.add(ProjectMembership(user_id=user.id, project_id=project_id, role=role))
    db.session.commit()
    return user.id
