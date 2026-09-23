import uuid
from datetime import datetime

from .extensions import db


def gen_uuid() -> str:
    return str(uuid.uuid4())


# --- Enum value sets (Database.md: "enums as strings for now") ---
# Python-side allowed-value sets, not a DB-level SQL enum — validation
# happens in the marshmallow schemas (Security.md §5), not a CHECK
# constraint, so allowed values can change without a migration.

class Role:
    OWNER = "Owner"
    MANAGER = "Manager"
    LEADER = "Leader"
    DEVELOPER = "Developer"
    ALL = {OWNER, MANAGER, LEADER, DEVELOPER}


class BoardViewPreference:
    TAG = "tag"
    SWIMLANE = "swimlane"
    ALL = {TAG, SWIMLANE}


class IssueCategory:
    TECHNICAL = "Technical"
    MANAGERIAL = "Managerial"
    DECISION = "Decision"
    ALL = {TECHNICAL, MANAGERIAL, DECISION}


class IssueStatus:
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    DONE = "Done"
    ALL = {OPEN, IN_PROGRESS, DONE}


class IssuePriority:
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    URGENT = "Urgent"
    ALL = {LOW, MEDIUM, HIGH, URGENT}


class ActivityEventType:
    ISSUE_CREATED = "issue_created"
    FIELD_UPDATED = "field_updated"
    ALL = {ISSUE_CREATED, FIELD_UPDATED}


class InviteStatus:
    PENDING = "Pending"
    ACCEPTED = "Accepted"
    EXPIRED = "Expired"
    ALL = {PENDING, ACCEPTED, EXPIRED}


class ResourceType:
    LINK = "link"
    FILE = "file"
    ALL = {LINK, FILE}


class PasswordResetStatus:
    PENDING = "Pending"
    USED = "Used"
    EXPIRED = "Expired"
    ALL = {PENDING, USED, EXPIRED}


class User(db.Model):
    __tablename__ = "user"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Flask-Login
    @property
    def is_authenticated(self):
        return True

    @property
    def is_active(self):
        return True

    @property
    def is_anonymous(self):
        return False

    def get_id(self):
        return self.id


class Project(db.Model):
    __tablename__ = "project"
    __table_args__ = (
        db.UniqueConstraint("owner_id", "key", name="uq_project_owner_key"),
    )

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    owner_id = db.Column(db.String(36), db.ForeignKey("user.id"), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    key = db.Column(db.String(20), nullable=False)
    next_issue_number = db.Column(db.Integer, nullable=False, default=1)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class ProjectMembership(db.Model):
    __tablename__ = "project_membership"
    __table_args__ = (
        db.UniqueConstraint("user_id", "project_id", name="uq_membership_user_project"),
        db.Index("ix_membership_project_id", "project_id"),
        db.Index("ix_membership_user_id", "user_id"),
    )

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("user.id"), nullable=False)
    project_id = db.Column(db.String(36), db.ForeignKey("project.id"), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    board_view_preference = db.Column(
        db.String(20), nullable=False, default=BoardViewPreference.TAG
    )
    joined_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class Issue(db.Model):
    __tablename__ = "issue"
    __table_args__ = (
        db.Index("ix_issue_project_status", "project_id", "status"),
        db.Index("ix_issue_assignee_id", "assignee_id"),
        db.Index("ix_issue_reporter_id", "reporter_id"),
        db.Index("ix_issue_priority", "priority"),
        db.Index("ix_issue_category", "category"),
        db.UniqueConstraint("project_id", "number", name="uq_issue_project_number"),
    )

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    project_id = db.Column(db.String(36), db.ForeignKey("project.id"), nullable=False)
    number = db.Column(db.Integer, nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(20), nullable=False, default=IssueStatus.OPEN)
    priority = db.Column(db.String(20), nullable=False)
    reporter_id = db.Column(db.String(36), db.ForeignKey("user.id"), nullable=False)
    assignee_id = db.Column(db.String(36), db.ForeignKey("user.id"), nullable=True)
    resolution_note = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    closed_at = db.Column(db.DateTime, nullable=True)


class Comment(db.Model):
    __tablename__ = "comment"
    __table_args__ = (db.Index("ix_comment_issue_id", "issue_id"),)

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    issue_id = db.Column(db.String(36), db.ForeignKey("issue.id"), nullable=False)
    author_id = db.Column(db.String(36), db.ForeignKey("user.id"), nullable=False)
    body = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class ActivityLog(db.Model):
    __tablename__ = "activity_log"
    __table_args__ = (
        db.Index("ix_activity_log_issue_created", "issue_id", "created_at"),
    )

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    issue_id = db.Column(db.String(36), db.ForeignKey("issue.id"), nullable=False)
    actor_id = db.Column(db.String(36), db.ForeignKey("user.id"), nullable=False)
    event_type = db.Column(db.String(20), nullable=False)
    meta = db.Column(db.JSON, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class Notification(db.Model):
    __tablename__ = "notification"
    __table_args__ = (db.Index("ix_notification_user_read", "user_id", "read"),)

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("user.id"), nullable=False)
    issue_id = db.Column(db.String(36), db.ForeignKey("issue.id"), nullable=True)
    type = db.Column(db.String(50), nullable=False)
    read = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class Invite(db.Model):
    __tablename__ = "invite"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    project_id = db.Column(db.String(36), db.ForeignKey("project.id"), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    invited_by = db.Column(db.String(36), db.ForeignKey("user.id"), nullable=False)
    status = db.Column(db.String(20), nullable=False, default=InviteStatus.PENDING)
    token = db.Column(db.String(128), unique=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class PasswordResetToken(db.Model):
    __tablename__ = "password_reset_token"
    __table_args__ = (db.Index("ix_password_reset_token_user_id", "user_id"),)

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("user.id"), nullable=False)
    token = db.Column(db.String(128), unique=True, nullable=False)
    status = db.Column(db.String(20), nullable=False, default=PasswordResetStatus.PENDING)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class ProjectFolder(db.Model):
    __tablename__ = "project_folder"
    __table_args__ = (db.Index("ix_project_folder_project_id", "project_id"),)

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    project_id = db.Column(db.String(36), db.ForeignKey("project.id"), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class ProjectResource(db.Model):
    __tablename__ = "project_resource"
    __table_args__ = (
        db.Index("ix_project_resource_project_id", "project_id"),
        db.Index("ix_project_resource_folder_id", "folder_id"),
    )

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    project_id = db.Column(db.String(36), db.ForeignKey("project.id"), nullable=False)
    folder_id = db.Column(
        db.String(36), db.ForeignKey("project_folder.id"), nullable=True
    )
    type = db.Column(db.String(10), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    url = db.Column(db.String(2048), nullable=False)
    uploaded_by = db.Column(db.String(36), db.ForeignKey("user.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
