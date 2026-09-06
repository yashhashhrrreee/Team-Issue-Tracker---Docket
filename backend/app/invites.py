import secrets
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from marshmallow import Schema, ValidationError, fields, validate

from .authz import get_membership_or_404
from .errors import ApiError
from .extensions import db
from .models import Invite, InviteStatus, Project, ProjectMembership, Role
from .serializers import invite_dict, membership_dict

invites_bp = Blueprint("invites", __name__, url_prefix="/api")

INVITE_TTL = timedelta(days=7)


class CreateInviteSchema(Schema):
    email = fields.Email(required=True)
    role = fields.Str(required=True, validate=validate.OneOf(Role.ALL))


class AcceptInviteSchema(Schema):
    token = fields.Str(required=True)
    email = fields.Email(required=True)


@invites_bp.post("/projects/<project_id>/invites")
@login_required
def create_invite(project_id):
    get_membership_or_404(current_user.id, project_id)
    if db.session.get(Project, project_id) is None:
        raise ApiError("not_found", "Resource not found.", 404)

    try:
        data = CreateInviteSchema().load(request.get_json(silent=True) or {})
    except ValidationError as err:
        raise ApiError("invalid_request", str(err.messages), 400)

    invite = Invite(
        project_id=project_id,
        email=data["email"],
        role=data["role"],
        invited_by=current_user.id,
        status=InviteStatus.PENDING,
        token=secrets.token_urlsafe(32),
        expires_at=datetime.utcnow() + INVITE_TTL,
    )
    db.session.add(invite)
    db.session.commit()
    return jsonify(invite_dict(invite)), 201


@invites_bp.post("/invites/accept")
@login_required
def accept_invite():
    try:
        data = AcceptInviteSchema().load(request.get_json(silent=True) or {})
    except ValidationError as err:
        raise ApiError("invalid_request", str(err.messages), 400)

    invalid = ApiError(
        "invalid_invite", "Code and email don't match an active invite.", 400
    )

    invite = Invite.query.filter_by(token=data["token"], email=data["email"]).first()
    if invite is None:
        raise invalid
    if invite.status != InviteStatus.PENDING:
        raise invalid
    if invite.expires_at < datetime.utcnow():
        raise invalid

    existing = ProjectMembership.query.filter_by(
        user_id=current_user.id, project_id=invite.project_id
    ).first()
    if existing is None:
        membership = ProjectMembership(
            user_id=current_user.id, project_id=invite.project_id, role=invite.role
        )
        db.session.add(membership)
    else:
        membership = existing

    invite.status = InviteStatus.ACCEPTED
    db.session.commit()
    return jsonify(membership_dict(membership))
