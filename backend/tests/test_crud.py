"""Standard CRUD + validation + Backlog filter coverage (Testing.md §2,
"Standard coverage" — last priority, after business logic and security)."""
from .conftest import csrf_header


def _login(client, username):
    resp = client.post("/api/auth/login", json={"username": username, "password": "password123"})
    assert resp.status_code == 200


def test_create_project_missing_name_returns_400(client, base_fixtures):
    _login(client, "alice")
    resp = client.post("/api/projects", json={"key": "NEW"}, headers=csrf_header(client))
    assert resp.status_code == 400


def test_list_projects_returns_role(client, base_fixtures):
    _login(client, "alice")
    resp = client.get("/api/projects")
    assert resp.status_code == 200
    data = resp.get_json()
    assert any(p["key"] == "ROC" and p["role"] == "Owner" for p in data)


def test_create_and_fetch_issue(client, base_fixtures):
    _login(client, "alice")
    created = client.post(
        f"/api/projects/{base_fixtures['project_id']}/issues",
        json={"title": "T", "description": "D", "category": "Managerial", "priority": "Urgent"},
        headers=csrf_header(client),
    )
    assert created.status_code == 201
    issue_id = created.get_json()["id"]

    fetched = client.get(f"/api/issues/{issue_id}")
    assert fetched.status_code == 200
    assert fetched.get_json()["title"] == "T"


def test_create_comment_missing_body_returns_400(client, base_fixtures):
    _login(client, "alice")
    resp = client.post(
        f"/api/issues/{base_fixtures['issue_id']}/comments", json={}, headers=csrf_header(client)
    )
    assert resp.status_code == 400


def test_create_comment_success(client, base_fixtures):
    _login(client, "alice")
    resp = client.post(
        f"/api/issues/{base_fixtures['issue_id']}/comments",
        json={"body": "Looking into it."},
        headers=csrf_header(client),
    )
    assert resp.status_code == 201
    assert resp.get_json()["body"] == "Looking into it."


def test_delete_issue(client, base_fixtures):
    _login(client, "alice")
    resp = client.delete(f"/api/issues/{base_fixtures['issue_id']}", headers=csrf_header(client))
    assert resp.status_code == 200

    fetched = client.get(f"/api/issues/{base_fixtures['issue_id']}")
    assert fetched.status_code == 404


def test_backlog_filter_by_status_priority_category_assignee(client, base_fixtures):
    _login(client, "alice")
    pid = base_fixtures["project_id"]
    client.post(
        f"/api/projects/{pid}/issues",
        json={"title": "Urgent tech", "description": "d", "category": "Technical", "priority": "Urgent"},
        headers=csrf_header(client),
    )
    client.post(
        f"/api/projects/{pid}/issues",
        json={"title": "Low mgmt", "description": "d", "category": "Managerial", "priority": "Low"},
        headers=csrf_header(client),
    )

    by_priority = client.get(f"/api/projects/{pid}/issues?priority=Urgent")
    assert all(i["priority"] == "Urgent" for i in by_priority.get_json())

    by_category = client.get(f"/api/projects/{pid}/issues?category=Managerial")
    assert all(i["category"] == "Managerial" for i in by_category.get_json())

    by_status = client.get(f"/api/projects/{pid}/issues?status=Open")
    assert all(i["status"] == "Open" for i in by_status.get_json())

    combined = client.get(f"/api/projects/{pid}/issues?priority=Urgent&category=Technical")
    assert len(combined.get_json()) == 1
    assert combined.get_json()[0]["title"] == "Urgent tech"


def test_backlog_search(client, base_fixtures):
    _login(client, "alice")
    pid = base_fixtures["project_id"]
    resp = client.get(f"/api/projects/{pid}/issues?search=Seed")
    titles = [i["title"] for i in resp.get_json()]
    assert "Seed issue" in titles


def test_invalid_sort_field_returns_400(client, base_fixtures):
    _login(client, "alice")
    resp = client.get(f"/api/projects/{base_fixtures['project_id']}/issues?sort=not_a_field")
    assert resp.status_code == 400


def test_notifications_mark_read(client, base_fixtures):
    _login(client, "alice")
    resp = client.get("/api/notifications")
    assert resp.status_code == 200


def test_create_folder_and_resource(client, base_fixtures):
    _login(client, "alice")
    pid = base_fixtures["project_id"]
    folder = client.post(f"/api/projects/{pid}/folders", json={"name": "Docs"}, headers=csrf_header(client))
    assert folder.status_code == 201
    folder_id = folder.get_json()["id"]

    resource = client.post(
        f"/api/projects/{pid}/resources",
        json={"name": "Spec", "type": "link", "url": "https://example.com", "folder_id": folder_id},
        headers=csrf_header(client),
    )
    assert resource.status_code == 201

    listed = client.get(f"/api/projects/{pid}/folders")
    assert listed.get_json()[0]["resources"][0]["name"] == "Spec"
