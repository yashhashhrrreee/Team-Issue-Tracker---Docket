"""Demo data: Rocket Squad project with alice (Owner) and bob (Developer).

Run with: .venv/Scripts/python.exe seed.py
Mirrors the fixture shape Testing.md §5 expects tests to reuse.
"""
from werkzeug.security import generate_password_hash

from app import create_app
from app.extensions import db
from app.models import (
    User,
    Project,
    ProjectMembership,
    Issue,
    Comment,
    ActivityLog,
    Role,
    IssueCategory,
    IssueStatus,
    IssuePriority,
    ActivityEventType,
)

app = create_app()

with app.app_context():
    db.drop_all()
    db.create_all()

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

    project = Project(
        owner_id=alice.id,
        name="Rocket Squad",
        description="Launch readiness tracking for the Rocket Squad team.",
        key="ROC",
    )
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
        title="Fuel gauge misreads under 10%",
        description="Gauge shows 0% while telemetry reports 8% remaining.",
        category=IssueCategory.TECHNICAL,
        status=IssueStatus.OPEN,
        priority=IssuePriority.HIGH,
        reporter_id=alice.id,
        assignee_id=bob.id,
    )
    db.session.add(issue)
    db.session.flush()

    db.session.add(
        ActivityLog(
            issue_id=issue.id,
            actor_id=alice.id,
            event_type=ActivityEventType.ISSUE_CREATED,
            meta={
                "title": issue.title,
                "description": issue.description,
                "category": issue.category,
                "status": issue.status,
                "priority": issue.priority,
                "assignee_id": issue.assignee_id,
            },
        )
    )
    db.session.add(
        Comment(issue_id=issue.id, author_id=bob.id, body="Looking into the sensor firmware.")
    )

    db.session.commit()
    print(f"Seeded: project={project.key} users=alice,bob issue={issue.id}")
