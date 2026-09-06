from .models import ProjectMembership


def get_membership_or_404(user_id, project_id):
    """Security.md §3: every project-scoped route checks membership first.

    404, not 403 — a non-member shouldn't be able to tell a project
    exists at all.
    """
    from .errors import ApiError

    membership = ProjectMembership.query.filter_by(
        user_id=user_id, project_id=project_id
    ).first()
    if membership is None:
        raise ApiError("not_found", "Resource not found.", 404)
    return membership
