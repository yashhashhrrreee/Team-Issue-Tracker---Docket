from flask import Blueprint, jsonify
from flask_login import current_user, login_required

from .errors import ApiError
from .extensions import db
from .models import Notification
from .serializers import notification_dict

notifications_bp = Blueprint("notifications", __name__, url_prefix="/api/notifications")


@notifications_bp.get("")
@login_required
def list_notifications():
    notifications = (
        Notification.query.filter_by(user_id=current_user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )
    return jsonify([notification_dict(n) for n in notifications])


@notifications_bp.patch("/<notification_id>")
@login_required
def mark_read(notification_id):
    notification = Notification.query.filter_by(
        id=notification_id, user_id=current_user.id
    ).first()
    if notification is None:
        raise ApiError("not_found", "Resource not found.", 404)

    notification.read = True
    db.session.commit()
    return jsonify(notification_dict(notification))
