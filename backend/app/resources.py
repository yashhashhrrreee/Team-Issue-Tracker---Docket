from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from marshmallow import Schema, ValidationError, fields, validate

from .authz import get_membership_or_404
from .errors import ApiError
from .extensions import db
from .models import ProjectFolder, ProjectResource, ResourceType
from .serializers import folder_dict, resource_dict

resources_bp = Blueprint("resources", __name__, url_prefix="/api/projects/<project_id>")


class CreateFolderSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=1, max=255))


class CreateResourceSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=1, max=255))
    type = fields.Str(required=True, validate=validate.OneOf(ResourceType.ALL))
    url = fields.Str(required=True, validate=validate.Length(min=1, max=2048))
    folder_id = fields.Str(required=False, allow_none=True)


@resources_bp.get("/folders")
@login_required
def list_folders(project_id):
    get_membership_or_404(current_user.id, project_id)

    folders = ProjectFolder.query.filter_by(project_id=project_id).all()
    payload = []
    for folder in folders:
        resources = ProjectResource.query.filter_by(
            project_id=project_id, folder_id=folder.id
        ).all()
        payload.append(folder_dict(folder, resources))
    return jsonify(payload)


@resources_bp.post("/folders")
@login_required
def create_folder(project_id):
    get_membership_or_404(current_user.id, project_id)

    try:
        data = CreateFolderSchema().load(request.get_json(silent=True) or {})
    except ValidationError as err:
        raise ApiError("invalid_request", str(err.messages), 400)

    folder = ProjectFolder(project_id=project_id, name=data["name"])
    db.session.add(folder)
    db.session.commit()
    return jsonify(folder_dict(folder, [])), 201


@resources_bp.post("/resources")
@login_required
def create_resource(project_id):
    get_membership_or_404(current_user.id, project_id)

    try:
        data = CreateResourceSchema().load(request.get_json(silent=True) or {})
    except ValidationError as err:
        raise ApiError("invalid_request", str(err.messages), 400)

    folder_id = data.get("folder_id")
    if folder_id and ProjectFolder.query.filter_by(
        id=folder_id, project_id=project_id
    ).first() is None:
        raise ApiError("invalid_request", "Folder does not belong to this project.", 400)

    resource = ProjectResource(
        project_id=project_id,
        folder_id=folder_id,
        type=data["type"],
        name=data["name"],
        url=data["url"],
        uploaded_by=current_user.id,
    )
    db.session.add(resource)
    db.session.commit()
    return jsonify(resource_dict(resource)), 201
