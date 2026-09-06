from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from marshmallow import Schema, ValidationError, fields, validate
from sqlalchemy.exc import IntegrityError

from .authz import get_membership_or_404
from .errors import ApiError
from .extensions import db
from .models import (
    BoardViewPreference,
    Issue,
    Project,
    ProjectFolder,
    ProjectMembership,
    ProjectResource,
    Role,
)
from .serializers import folder_dict, issue_dict, membership_dict, project_dict, resource_dict

projects_bp = Blueprint("projects", __name__, url_prefix="/api/projects")


class CreateProjectSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=1, max=255))
    description = fields.Str(required=False, allow_none=True, validate=validate.Length(max=5000))
    key = fields.Str(required=True, validate=validate.Length(min=1, max=20))


class UpdateProjectSchema(Schema):
    name = fields.Str(required=False, validate=validate.Length(min=1, max=255))
    description = fields.Str(required=False, allow_none=True, validate=validate.Length(max=5000))
    key = fields.Str(required=False, validate=validate.Length(min=1, max=20))


class UpdateMembershipSchema(Schema):
    board_view_preference = fields.Str(
        required=True, validate=validate.OneOf(BoardViewPreference.ALL)
    )


@projects_bp.get("")
@login_required
def list_projects():
    memberships = ProjectMembership.query.filter_by(user_id=current_user.id).all()
    result = []
    for m in memberships:
        project = db.session.get(Project, m.project_id)
        result.append({**project_dict(project), "role": m.role})
    return jsonify(result)


@projects_bp.post("")
@login_required
def create_project():
    try:
        data = CreateProjectSchema().load(request.get_json(silent=True) or {})
    except ValidationError as err:
        raise ApiError("invalid_request", str(err.messages), 400)

    project = Project(
        owner_id=current_user.id,
        name=data["name"],
        description=data.get("description"),
        key=data["key"],
    )
    db.session.add(project)
    try:
        db.session.flush()
    except IntegrityError:
        db.session.rollback()
        raise ApiError(
            "duplicate_project_key",
            "You already have a project with that key.",
            409,
        )

    db.session.add(
        ProjectMembership(user_id=current_user.id, project_id=project.id, role=Role.OWNER)
    )
    db.session.commit()
    return jsonify(project_dict(project)), 201


@projects_bp.get("/<project_id>")
@login_required
def get_project(project_id):
    get_membership_or_404(current_user.id, project_id)
    project = db.session.get(Project, project_id)
    if project is None:
        raise ApiError("not_found", "Resource not found.", 404)

    member_count = ProjectMembership.query.filter_by(project_id=project_id).count()

    status_counts = dict(
        db.session.query(Issue.status, db.func.count(Issue.id))
        .filter_by(project_id=project_id)
        .group_by(Issue.status)
        .all()
    )
    category_counts = dict(
        db.session.query(Issue.category, db.func.count(Issue.id))
        .filter_by(project_id=project_id)
        .group_by(Issue.category)
        .all()
    )

    folders = ProjectFolder.query.filter_by(project_id=project_id).all()
    folder_payload = []
    for folder in folders:
        resources = ProjectResource.query.filter_by(
            project_id=project_id, folder_id=folder.id
        ).all()
        folder_payload.append(folder_dict(folder, resources))
    top_level_resources = ProjectResource.query.filter_by(
        project_id=project_id, folder_id=None
    ).all()

    latest_issues = (
        Issue.query.filter_by(project_id=project_id)
        .order_by(Issue.updated_at.desc())
        .limit(5)
        .all()
    )

    return jsonify(
        {
            **project_dict(project),
            "stats": {
                "member_count": member_count,
                "status_counts": status_counts,
                "category_counts": category_counts,
            },
            "folders": folder_payload,
            "top_level_resources": [resource_dict(r) for r in top_level_resources],
            "latest_issues": [issue_dict(i) for i in latest_issues],
        }
    )


@projects_bp.patch("/<project_id>")
@login_required
def update_project(project_id):
    get_membership_or_404(current_user.id, project_id)
    project = db.session.get(Project, project_id)
    if project is None:
        raise ApiError("not_found", "Resource not found.", 404)

    try:
        data = UpdateProjectSchema().load(request.get_json(silent=True) or {})
    except ValidationError as err:
        raise ApiError("invalid_request", str(err.messages), 400)

    for field in ("name", "description", "key"):
        if field in data:
            setattr(project, field, data[field])

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise ApiError(
            "duplicate_project_key",
            "You already have a project with that key.",
            409,
        )

    return jsonify(project_dict(project))


@projects_bp.patch("/<project_id>/membership")
@login_required
def update_own_membership(project_id):
    membership = get_membership_or_404(current_user.id, project_id)

    try:
        data = UpdateMembershipSchema().load(request.get_json(silent=True) or {})
    except ValidationError as err:
        raise ApiError("invalid_request", str(err.messages), 400)

    membership.board_view_preference = data["board_view_preference"]
    db.session.commit()
    return jsonify(membership_dict(membership))
