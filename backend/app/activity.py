from flask import Blueprint, jsonify
from flask_login import current_user, login_required

from .authz import get_membership_or_404
from .errors import ApiError
from .extensions import db
from .models import ActivityLog, Issue
from .serializers import activity_log_dict

activity_bp = Blueprint("activity", __name__, url_prefix="/api")


@activity_bp.get("/issues/<issue_id>/activity")
@login_required
def get_issue_activity(issue_id):
    issue = db.session.get(Issue, issue_id)
    if issue is None:
        raise ApiError("not_found", "Resource not found.", 404)
    get_membership_or_404(current_user.id, issue.project_id)

    entries = (
        ActivityLog.query.filter_by(issue_id=issue_id)
        .order_by(ActivityLog.created_at.asc())
        .all()
    )
    return jsonify([activity_log_dict(a) for a in entries])
