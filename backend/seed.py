"""Demo data: Rocket Squad project with alice (Owner), bob (Developer),
carol (Leader). Ticket spread (3 Open / 2 In Progress / 1 Done, mixed
categories/priorities) mirrors the Board mockup's Engine Room example.

Run with: .venv/Scripts/python.exe seed.py
Mirrors the fixture shape Testing.md §5 expects tests to reuse.
"""
from datetime import datetime, timedelta

from werkzeug.security import generate_password_hash

from app import create_app
from app.extensions import db
from app.issues import assign_issue_number
from app.models import (
    User,
    Project,
    ProjectMembership,
    Issue,
    Comment,
    ActivityLog,
    ProjectFolder,
    ProjectResource,
    ResourceType,
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
    carol = User(
        username="carol",
        email="carol@example.com",
        password_hash=generate_password_hash("password123"),
    )
    db.session.add_all([alice, bob, carol])
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
            ProjectMembership(user_id=carol.id, project_id=project.id, role=Role.LEADER),
        ]
    )

    now = datetime.utcnow()

    def make_issue(title, description, category, status, priority, reporter, assignee, age_hours, resolution_note=None):
        issue = Issue(
            project_id=project.id,
            number=assign_issue_number(project.id),
            title=title,
            description=description,
            category=category,
            status=status,
            priority=priority,
            reporter_id=reporter.id,
            assignee_id=assignee.id if assignee else None,
            resolution_note=resolution_note,
            created_at=now - timedelta(hours=age_hours),
            updated_at=now - timedelta(hours=max(age_hours - 3, 0)),
            closed_at=now - timedelta(hours=2) if status == IssueStatus.DONE else None,
        )
        db.session.add(issue)
        db.session.flush()
        db.session.add(
            ActivityLog(
                issue_id=issue.id,
                actor_id=reporter.id,
                event_type=ActivityEventType.ISSUE_CREATED,
                meta={
                    "title": issue.title,
                    "description": issue.description,
                    "category": issue.category,
                    "status": IssueStatus.OPEN,
                    "priority": issue.priority,
                    "assignee_id": issue.assignee_id,
                },
                created_at=issue.created_at,
            )
        )
        if status != IssueStatus.OPEN:
            db.session.add(
                ActivityLog(
                    issue_id=issue.id,
                    actor_id=assignee.id if assignee else reporter.id,
                    event_type=ActivityEventType.FIELD_UPDATED,
                    meta={"field": "status", "from": IssueStatus.OPEN, "to": status},
                    created_at=issue.updated_at,
                )
            )
        return issue

    fuel_gauge = make_issue(
        "Fuel gauge misreads under 10%",
        "Gauge shows 0% while telemetry reports 8% remaining.",
        IssueCategory.TECHNICAL, IssueStatus.OPEN, IssuePriority.HIGH,
        alice, bob, age_hours=6,
    )
    make_issue(
        "Decide on caching strategy for search index",
        "Need a call on whether to precompute or query live for the parts catalog search.",
        IssueCategory.DECISION, IssueStatus.OPEN, IssuePriority.HIGH,
        bob, carol, age_hours=30,
    )
    make_issue(
        "Draft Q3 roadmap review deck",
        "Summarize launch readiness milestones for the quarterly review.",
        IssueCategory.MANAGERIAL, IssueStatus.OPEN, IssuePriority.LOW,
        alice, alice, age_hours=48,
    )
    rate_limiter = make_issue(
        "Rate limiter drops requests under burst load",
        "Under sustained burst traffic (roughly 3x baseline for more than 10 seconds), the rate "
        "limiter starts dropping legitimate requests instead of queuing them. Suspect the token "
        "bucket refill isn't accounting for concurrent goroutines correctly.",
        IssueCategory.TECHNICAL, IssueStatus.IN_PROGRESS, IssuePriority.URGENT,
        bob, alice, age_hours=26,
    )
    make_issue(
        "Add pagination to the audit log viewer",
        "Viewer loads the full table today; needs cursor-based pagination before it grows further.",
        IssueCategory.TECHNICAL, IssueStatus.IN_PROGRESS, IssuePriority.MEDIUM,
        carol, alice, age_hours=20,
    )
    make_issue(
        "Update onboarding checklist for new hires",
        "Checklist still references the old deploy process.",
        IssueCategory.MANAGERIAL, IssueStatus.DONE, IssuePriority.LOW,
        alice, alice, age_hours=72,
        resolution_note="Rewrote the checklist to match the current CI/CD pipeline and added a link to the runbook.",
    )
    make_issue(
        "Postgres vs. queue-based ingestion for telemetry",
        "Need a call on how launch telemetry gets ingested before the next test flight.",
        IssueCategory.DECISION, IssueStatus.DONE, IssuePriority.MEDIUM,
        bob, carol, age_hours=200,
        resolution_note="Went with Postgres and a partitioned table by day. Ingestion volume (under 50/sec peak) "
        "doesn't need a dedicated queue, and staying relational let the dashboard query launch events directly "
        "instead of maintaining a second read path.",
    )

    db.session.add_all(
        [
            Comment(issue_id=rate_limiter.id, author_id=bob.id, created_at=now - timedelta(hours=4),
                    body="Can reproduce locally with the load test script. Looks like it's the refill goroutine, not the bucket size."),
            Comment(issue_id=rate_limiter.id, author_id=alice.id, created_at=now - timedelta(hours=2),
                    body="Confirmed. Adding a mutex around the refill counter now, will push a fix shortly."),
            Comment(issue_id=fuel_gauge.id, author_id=bob.id, body="Looking into the sensor firmware."),
        ]
    )

    design_folder = ProjectFolder(project_id=project.id, name="Design references")
    eng_folder = ProjectFolder(project_id=project.id, name="Engineering docs")
    db.session.add_all([design_folder, eng_folder])
    db.session.flush()

    db.session.add_all(
        [
            ProjectResource(
                project_id=project.id, folder_id=design_folder.id, type=ResourceType.LINK,
                name="Figma — system components", url="https://figma.com/file/example",
                uploaded_by=alice.id,
            ),
            ProjectResource(
                project_id=project.id, folder_id=design_folder.id, type=ResourceType.FILE,
                name="brand-guidelines.pdf", url="/uploads/brand-guidelines.pdf",
                uploaded_by=alice.id,
            ),
            ProjectResource(
                project_id=project.id, folder_id=None, type=ResourceType.LINK,
                name="Launch readiness tracker — Sheets", url="https://sheets.example.com/tracker",
                uploaded_by=bob.id,
            ),
        ]
    )

    db.session.commit()
    issue_count = Issue.query.filter_by(project_id=project.id).count()
    print(f"Seeded: project={project.key} users=alice,bob,carol issues={issue_count}")
