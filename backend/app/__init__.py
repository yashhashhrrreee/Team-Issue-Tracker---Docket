import os

from flask import Flask
from flask_cors import CORS

from .config import Config
from .extensions import db, login_manager, migrate, limiter


def create_app(config_class=Config):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(config_class)

    os.makedirs(app.instance_path, exist_ok=True)

    db.init_app(app)
    login_manager.init_app(app)
    migrate.init_app(app, db)
    limiter.init_app(app)
    CORS(app, origins=[app.config["FRONTEND_ORIGIN"]], supports_credentials=True)

    from . import models  # noqa: F401  (register models with SQLAlchemy metadata)

    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(models.User, user_id)

    from .csrf import enforce_csrf

    app.before_request(enforce_csrf)

    @app.after_request
    def set_security_headers(response):
        # Security.md §8: standard defensive headers on every API response.
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        if app.config["FLASK_ENV"] == "production":
            response.headers["Strict-Transport-Security"] = (
                "max-age=63072000; includeSubDomains"
            )
        return response

    from .errors import register_error_handlers

    register_error_handlers(app)

    from .auth import auth_bp
    from .projects import projects_bp
    from .invites import invites_bp
    from .members import members_bp
    from .issues import issues_bp
    from .comments import comments_bp
    from .activity import activity_bp
    from .notifications import notifications_bp
    from .resources import resources_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(projects_bp)
    app.register_blueprint(invites_bp)
    app.register_blueprint(members_bp)
    app.register_blueprint(issues_bp)
    app.register_blueprint(comments_bp)
    app.register_blueprint(activity_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(resources_bp)

    return app
