from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from marshmallow import Schema, ValidationError, fields, validate

from .authz import get_membership_or_404
from .errors import ApiError
from .extensions import db
from .models import Comment, Issue
from .serializers import comment_dict

comments_bp = Blueprint("comments", __name__, url_prefix="/api")


class CreateCommentSchema(Schema):
    body = fields.Str(required=True, validate=validate.Length(min=1, max=5000))


@comments_bp.post("/issues/<issue_id>/comments")
@login_required
def create_comment(issue_id):
    issue = db.session.get(Issue, issue_id)
    if issue is None:
        raise ApiError("not_found", "Resource not found.", 404)
    get_membership_or_404(current_user.id, issue.project_id)

    try:
        data = CreateCommentSchema().load(request.get_json(silent=True) or {})
    except ValidationError as err:
        raise ApiError("invalid_request", str(err.messages), 400)

    comment = Comment(issue_id=issue_id, author_id=current_user.id, body=data["body"])
    db.session.add(comment)
    db.session.commit()
    return jsonify(comment_dict(comment)), 201
