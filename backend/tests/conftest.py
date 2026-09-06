import os
import tempfile

import pytest
from werkzeug.security import generate_password_hash

from app import create_app
from app.config import Config
from app.extensions import db
from app.models import Issue, IssueCategory, IssuePriority, IssueStatus, Project, ProjectMembership, Role, User


class TestConfig(Config):
    TESTING = True
    WTF_CSRF_ENABLED = False


@pytest.fixture
def app():
    db_fd, db_path = tempfile.mkstemp(suffix=".sqlite3")
    TestConfig.SQLALCHEMY_DATABASE_URI = "sqlite:///" + db_path
    application = create_app(TestConfig)

    with application.app_context():
        db.create_all()
        yield application
        db.session.remove()
        db.drop_all()
        db.engine.dispose()  # Windows holds the sqlite file open otherwise

    os.close(db_fd)
    os.unlink(db_path)


@pytest.fixture
def client(app):
    return app.test_client()


def csrf_header(client):
    cookie = client.get_cookie("csrf_token")
    return {"X-CSRF-Token": cookie.value} if cookie else {}


def register_and_login(client, username, email, password="password123"):
    resp = client.post(
        "/api/auth/register",
        json={"username": username, "email": email, "password": password},
    )
    assert resp.status_code == 201, resp.get_json()
    return resp.get_json()["id"]


def login(client, username, password="password123"):
    resp = client.post("/api/auth/login", json={"username": username, "password": password})
    assert resp.status_code == 200, resp.get_json()
    return resp.get_json()["id"]


@pytest.fixture
def user_factory(client):
    def _make(username, email=None):
        return register_and_login(client, username, email or f"{username}@example.com")

    return _make


@pytest.fixture
def base_fixtures(app, client):
    """Rocket Squad: alice (Owner), bob (Developer). Mirrors seed.py."""
    with app.app_context():
        alice = User(
            username="alice",
            email="alice@example.com",
            password_hash=generate_password_hash("password123"),
        )
        bob = User(
            username="bob",
            email="bob@example.com",
            password_hash=generate_password_hash("password123"),
        )
        db.session.add_all([alice, bob])
        db.session.flush()

        project = Project(owner_id=alice.id, name="Rocket Squad", description="Test project.", key="ROC")
        db.session.add(project)
        db.session.flush()

        db.session.add_all(
            [
                ProjectMembership(user_id=alice.id, project_id=project.id, role=Role.OWNER),
                ProjectMembership(user_id=bob.id, project_id=project.id, role=Role.DEVELOPER),
            ]
        )

        issue = Issue(
            project_id=project.id,
            title="Seed issue",
            description="Seed description.",
            category=IssueCategory.TECHNICAL,
            status=IssueStatus.OPEN,
            priority=IssuePriority.HIGH,
            reporter_id=alice.id,
            assignee_id=bob.id,
        )
        db.session.add(issue)
        db.session.commit()

        return {
            "alice_id": alice.id,
            "bob_id": bob.id,
            "project_id": project.id,
            "issue_id": issue.id,
        }
