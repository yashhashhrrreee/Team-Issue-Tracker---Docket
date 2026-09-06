from flask import jsonify
from marshmallow import ValidationError


class ApiError(Exception):
    def __init__(self, code, message, status_code=400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


def _error_response(code, message, status_code):
    response = jsonify({"error": {"code": code, "message": message}})
    response.status_code = status_code
    return response


def register_error_handlers(app):
    @app.errorhandler(ApiError)
    def handle_api_error(err):
        return _error_response(err.code, err.message, err.status_code)

    @app.errorhandler(ValidationError)
    def handle_validation_error(err):
        return _error_response("invalid_request", str(err.messages), 400)

    @app.errorhandler(404)
    def handle_not_found(err):
        return _error_response("not_found", "Resource not found.", 404)

    @app.errorhandler(401)
    def handle_unauthorized(err):
        return _error_response("not_authenticated", "Login required.", 401)

    @app.errorhandler(403)
    def handle_forbidden(err):
        return _error_response("forbidden", "Not permitted.", 403)
