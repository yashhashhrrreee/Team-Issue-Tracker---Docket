from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from marshmallow import Schema, ValidationError, fields, validate
from sqlalchemy import text

from .authz import get_membership_or_404
from .errors import ApiError
from .extensions import db
from .models import (
    ActivityEventType,
    ActivityLog,
    Comment,
    Issue,
    IssueCategory,
    IssuePriority,
    IssueStatus,
    Notification,
    ProjectMembership,
    Role,
)
from .serializers import activity_log_dict, comment_dict, issue_dict

issues_bp = Blueprint("issues", __name__, url_prefix="/api")

# Backend.md §5 rule 1: every create/update writes to ACTIVITY_LOG. Only
# these fields participate in diff-based logging on PATCH; status is
# deliberately excluded here and only mutable via POST /status, so the
# resolution_note-on-Done rule (rule 2) can't be bypassed by PATCHing
# status directly. See Decisions.md.
DIFFABLE_FIELDS = ["title", "description", "category", "priority", "assignee_id", "resolution_note"]

SORT_FIELDS = {"created_at", "updated_at", "priority", "status", "title"}


class CreateIssueSchema(Schema):
    title = fields.Str(required=True, validate=validate.Length(min=1, max=255))
    description = fields.Str(required=True, validate=validate.Length(max=10000))
    category = fields.Str(required=True, validate=validate.OneOf(IssueCategory.ALL))
    priority = fields.Str(required=True, validate=validate.OneOf(IssuePriority.ALL))
    assignee_id = fields.Str(required=False, allow_none=True)


class UpdateIssueSchema(Schema):
    title = fields.Str(required=False, validate=validate.Length(min=1, max=255))
    description = fields.Str(required=False, validate=validate.Length(max=10000))
    category = fields.Str(required=False, validate=validate.OneOf(IssueCategory.ALL))
    priority = fields.Str(required=False, validate=validate.OneOf(IssuePriority.ALL))
    assignee_id = fields.Str(required=False, allow_none=True)
    resolution_note = fields.Str(required=False, allow_none=True, validate=validate.Length(max=10000))


class StatusChangeSchema(Schema):
    status = fields.Str(required=True, validate=validate.OneOf(IssueStatus.ALL))
    resolution_note = fields.Str(required=False, allow_none=True, validate=validate.Length(max=10000))


def _log_activity(issue_id, actor_id, event_type, meta):
    db.session.add(
        ActivityLog(issue_id=issue_id, actor_id=actor_id, event_type=event_type, meta=meta)
    )


def _notify_decision(project_id, issue_id):
    recipients = ProjectMembership.query.filter(
        ProjectMembership.project_id == project_id,
        ProjectMembership.role.in_([Role.LEADER, Role.MANAGER]),
    ).all()
    for m in recipients:
        db.session.add(
            Notification(
                user_id=m.user_id,
                issue_id=issue_id,
                type="decision_needed",
                read=False,
            )
        )


def assign_issue_number(project_id):
    """Database.md §2: atomic PROJECT.next_issue_number increment, never
    a MAX(number)+1 read — that races under concurrent creates on the
    same project. Commits immediately so the row lock is held only for
    this one statement, not the rest of the request.
    """
    result = db.session.execute(
        text(
            "UPDATE project SET next_issue_number = next_issue_number + 1 "
            "WHERE id = :pid RETURNING next_issue_number - 1"
        ),
        {"pid": project_id},
    )
    number = result.scalar_one()
    db.session.commit()
    return number


def _get_issue_or_404(issue_id):
    issue = db.session.get(Issue, issue_id)
    if issue is None:
        raise ApiError("not_found", "Resource not found.", 404)
    return issue


@issues_bp.get("/projects/<project_id>/issues")
@login_required
def list_issues(project_id):
    get_membership_or_404(current_user.id, project_id)

    query = Issue.query.filter_by(project_id=project_id)

    status = request.args.get("status")
    if status:
        if status not in IssueStatus.ALL:
            raise ApiError("invalid_request", "Invalid status filter.", 400)
        query = query.filter(Issue.status == status)

    priority = request.args.get("priority")
    if priority:
        if priority not in IssuePriority.ALL:
            raise ApiError("invalid_request", "Invalid priority filter.", 400)
        query = query.filter(Issue.priority == priority)

    category = request.args.get("category")
    if category:
        if category not in IssueCategory.ALL:
            raise ApiError("invalid_request", "Invalid category filter.", 400)
        query = query.filter(Issue.category == category)

    assignee_id = request.args.get("assignee_id")
    if assignee_id:
        query = query.filter(Issue.assignee_id == assignee_id)

    search = request.args.get("search")
    if search:
        like = f"%{search}%"
        query = query.filter(db.or_(Issue.title.ilike(like), Issue.description.ilike(like)))

    sort = request.args.get("sort", "-updated_at")
    sort_field = sort.lstrip("-")
    if sort_field not in SORT_FIELDS:
        raise ApiError("invalid_request", "Invalid sort field.", 400)
    column = getattr(Issue, sort_field)
    query = query.order_by(column.desc() if sort.startswith("-") else column.asc())

    return jsonify([issue_dict(i) for i in query.all()])


@issues_bp.post("/projects/<project_id>/issues")
@login_required
def create_issue(project_id):
    get_membership_or_404(current_user.id, project_id)

    try:
        data = CreateIssueSchema().load(request.get_json(silent=True) or {})
    except ValidationError as err:
        raise ApiError("invalid_request", str(err.messages), 400)

    assignee_id = data.get("assignee_id")
    if assignee_id and ProjectMembership.query.filter_by(
        project_id=project_id, user_id=assignee_id
    ).first() is None:
        raise ApiError("invalid_request", "Assignee is not a project member.", 400)

    number = assign_issue_number(project_id)

    issue = Issue(
        project_id=project_id,
        number=number,
        title=data["title"],
        description=data["description"],
        category=data["category"],
        priority=data["priority"],
        status=IssueStatus.OPEN,
        reporter_id=current_user.id,
        assignee_id=assignee_id,
    )
    db.session.add(issue)
    db.session.flush()

    _log_activity(
        issue.id,
        current_user.id,
        ActivityEventType.ISSUE_CREATED,
        {
            "title": issue.title,
            "description": issue.description,
            "category": issue.category,
            "status": issue.status,
            "priority": issue.priority,
            "assignee_id": issue.assignee_id,
        },
    )

    if issue.category == IssueCategory.DECISION:
        _notify_decision(project_id, issue.id)

    db.session.commit()
    return jsonify(issue_dict(issue)), 201


@issues_bp.get("/issues/<issue_id>")
@login_required
def get_issue(issue_id):
    issue = _get_issue_or_404(issue_id)
    get_membership_or_404(current_user.id, issue.project_id)

    activity = (
        ActivityLog.query.filter_by(issue_id=issue_id).order_by(ActivityLog.created_at.asc()).all()
    )
    comments = Comment.query.filter_by(issue_id=issue_id).order_by(Comment.created_at.asc()).all()

    return jsonify(
        {
            **issue_dict(issue),
            "activity": [activity_log_dict(a) for a in activity],
            "comments": [comment_dict(c) for c in comments],
        }
    )


@issues_bp.patch("/issues/<issue_id>")
@login_required
def update_issue(issue_id):
    issue = _get_issue_or_404(issue_id)
    get_membership_or_404(current_user.id, issue.project_id)

    try:
        data = UpdateIssueSchema().load(request.get_json(silent=True) or {})
    except ValidationError as err:
        raise ApiError("invalid_request", str(err.messages), 400)

    if "assignee_id" in data and data["assignee_id"]:
        if ProjectMembership.query.filter_by(
            project_id=issue.project_id, user_id=data["assignee_id"]
        ).first() is None:
            raise ApiError("invalid_request", "Assignee is not a project member.", 400)

    old_category = issue.category
    for field in DIFFABLE_FIELDS:
        if field not in data:
            continue
        old_value = getattr(issue, field)
        new_value = data[field]
        if old_value == new_value:
            continue
        setattr(issue, field, new_value)
        _log_activity(
            issue.id,
            current_user.id,
            ActivityEventType.FIELD_UPDATED,
            {"field": field, "from": old_value, "to": new_value},
        )

    if issue.category == IssueCategory.DECISION and old_category != IssueCategory.DECISION:
        _notify_decision(issue.project_id, issue.id)

    db.session.commit()
    return jsonify(issue_dict(issue))


@issues_bp.post("/issues/<issue_id>/status")
@login_required
def change_status(issue_id):
    issue = _get_issue_or_404(issue_id)
    get_membership_or_404(current_user.id, issue.project_id)

    try:
        data = StatusChangeSchema().load(request.get_json(silent=True) or {})
    except ValidationError as err:
        raise ApiError("invalid_request", str(err.messages), 400)

    new_status = data["status"]
    if new_status == IssueStatus.DONE and not data.get("resolution_note"):
        raise ApiError(
            "resolution_note_required",
            "A resolution note is required to close this ticket.",
            400,
        )

    old_status = issue.status
    if old_status != new_status:
        issue.status = new_status
        _log_activity(
            issue.id,
            current_user.id,
            ActivityEventType.FIELD_UPDATED,
            {"field": "status", "from": old_status, "to": new_status},
        )
        if new_status == IssueStatus.DONE:
            issue.closed_at = datetime.utcnow()

    if new_status == IssueStatus.DONE and data.get("resolution_note"):
        old_note = issue.resolution_note
        issue.resolution_note = data["resolution_note"]
        if old_note != issue.resolution_note:
            _log_activity(
                issue.id,
                current_user.id,
                ActivityEventType.FIELD_UPDATED,
                {"field": "resolution_note", "from": old_note, "to": issue.resolution_note},
            )

    db.session.commit()
    return jsonify(issue_dict(issue))


@issues_bp.delete("/issues/<issue_id>")
@login_required
def delete_issue(issue_id):
    issue = _get_issue_or_404(issue_id)
    get_membership_or_404(current_user.id, issue.project_id)

    Comment.query.filter_by(issue_id=issue_id).delete()
    ActivityLog.query.filter_by(issue_id=issue_id).delete()
    Notification.query.filter_by(issue_id=issue_id).update({"issue_id": None})
    db.session.delete(issue)
    db.session.commit()
    return jsonify({"ok": True})
