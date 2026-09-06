from flask import Blueprint, jsonify
from flask_login import current_user, login_required

from .authz import get_membership_or_404
from .errors import ApiError
from .extensions import db
from .models import Issue, IssueStatus, ProjectMembership, User
from .serializers import issue_dict, user_public

members_bp = Blueprint("members", __name__, url_prefix="/api/projects/<project_id>/members")


@members_bp.get("")
@login_required
def list_members(project_id):
    get_membership_or_404(current_user.id, project_id)

    memberships = ProjectMembership.query.filter_by(project_id=project_id).all()
    result = []
    for m in memberships:
        user = db.session.get(User, m.user_id)
        open_count = Issue.query.filter(
            Issue.project_id == project_id,
            Issue.assignee_id == m.user_id,
            Issue.status != IssueStatus.DONE,
        ).count()
        result.append(
            {
                **user_public(user),
                "role": m.role,
                "joined_at": m.joined_at.isoformat(),
                "open_ticket_count": open_count,
            }
        )
    return jsonify(result)


@members_bp.get("/<user_id>")
@login_required
def member_profile(project_id, user_id):
    get_membership_or_404(current_user.id, project_id)

    target_membership = ProjectMembership.query.filter_by(
        project_id=project_id, user_id=user_id
    ).first()
    if target_membership is None:
        raise ApiError("not_found", "Resource not found.", 404)

    user = db.session.get(User, user_id)
    issues = Issue.query.filter_by(project_id=project_id, assignee_id=user_id).all()
    by_status = {status: [] for status in IssueStatus.ALL}
    for issue in issues:
        by_status[issue.status].append(issue_dict(issue))

    return jsonify(
        {
            **user_public(user),
            "role": target_membership.role,
            "issues_by_status": by_status,
        }
    )
