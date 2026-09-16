import secrets
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from marshmallow import Schema, ValidationError, fields, validate

from .authz import get_membership_or_404
from .errors import ApiError
from .extensions import db
from .models import Invite, InviteStatus, Project, ProjectMembership, Role
from .serializers import invite_dict, iso, membership_dict

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


@invites_bp.get("/projects/<project_id>/invites")
@login_required
def list_invites(project_id):
    get_membership_or_404(current_user.id, project_id)

    # Deliberately excludes `token` — Database.md's join-verification
    # rule depends on a leaked email+token pair not being guessable
    # together; every project member can already see the invited email
    # here, so also exposing the token would let any member accept in
    # that person's place.
    invites = Invite.query.filter_by(project_id=project_id, status=InviteStatus.PENDING).all()
    return jsonify(
        [
            {
                "id": i.id,
                "email": i.email,
                "role": i.role,
                "status": i.status,
                "created_at": iso(i.created_at),
            }
            for i in invites
        ]
    )


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
    # Security.md §7: token+email matching the INVITE row proves the
    # caller *possesses* those two values, not that they *are* the
    # invitee — bind acceptance to the authenticated account's own email.
    if current_user.email.lower() != invite.email.lower():
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
