def iso(dt):
    # All timestamps are naive datetime.utcnow() values (Database.md's
    # convention) — isoformat() alone omits the UTC marker, so a browser's
    # `new Date(...)` misparses the string as local time instead of UTC,
    # silently corrupting every relative-time display by the local offset.
    return dt.isoformat() + "Z" if dt is not None else None


def user_public(user):
    return {"id": user.id, "username": user.username, "email": user.email}


def project_dict(project):
    return {
        "id": project.id,
        "owner_id": project.owner_id,
        "name": project.name,
        "description": project.description,
        "key": project.key,
        "created_at": iso(project.created_at),
    }


def membership_dict(membership):
    return {
        "id": membership.id,
        "user_id": membership.user_id,
        "project_id": membership.project_id,
        "role": membership.role,
        "board_view_preference": membership.board_view_preference,
        "joined_at": iso(membership.joined_at),
    }


def issue_dict(issue):
    return {
        "id": issue.id,
        "project_id": issue.project_id,
        "number": issue.number,
        "title": issue.title,
        "description": issue.description,
        "category": issue.category,
        "status": issue.status,
        "priority": issue.priority,
        "reporter_id": issue.reporter_id,
        "assignee_id": issue.assignee_id,
        "resolution_note": issue.resolution_note,
        "created_at": iso(issue.created_at),
        "updated_at": iso(issue.updated_at),
        "closed_at": iso(issue.closed_at),
    }


def comment_dict(comment):
    return {
        "id": comment.id,
        "issue_id": comment.issue_id,
        "author_id": comment.author_id,
        "body": comment.body,
        "created_at": iso(comment.created_at),
    }


def activity_log_dict(entry):
    return {
        "id": entry.id,
        "issue_id": entry.issue_id,
        "actor_id": entry.actor_id,
        "event_type": entry.event_type,
        "meta": entry.meta,
        "created_at": iso(entry.created_at),
    }


def notification_dict(notification):
    return {
        "id": notification.id,
        "user_id": notification.user_id,
        "issue_id": notification.issue_id,
        "type": notification.type,
        "read": notification.read,
        "created_at": iso(notification.created_at),
    }


def invite_dict(invite):
    return {
        "id": invite.id,
        "project_id": invite.project_id,
        "email": invite.email,
        "role": invite.role,
        "invited_by": invite.invited_by,
        "status": invite.status,
        "token": invite.token,
        "expires_at": iso(invite.expires_at),
        "created_at": iso(invite.created_at),
    }


def folder_dict(folder, resources):
    return {
        "id": folder.id,
        "project_id": folder.project_id,
        "name": folder.name,
        "created_at": iso(folder.created_at),
        "resources": [resource_dict(r) for r in resources],
    }


def resource_dict(resource):
    return {
        "id": resource.id,
        "project_id": resource.project_id,
        "folder_id": resource.folder_id,
        "type": resource.type,
        "name": resource.name,
        "url": resource.url,
        "uploaded_by": resource.uploaded_by,
        "created_at": iso(resource.created_at),
    }
