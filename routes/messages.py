"""Messaging routes: conversations, messages, read receipts, edit, and delete."""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..services import message_service
from ..utils.message_media import save_message_image

messages_bp = Blueprint("messages", __name__, url_prefix="/api/messages")


@messages_bp.get("/conversations")
@jwt_required()
def get_conversations():
    """List all conversations for the authenticated user."""
    user_id = int(get_jwt_identity())
    result = message_service.get_conversations(user_id)
    return jsonify(result)


@messages_bp.post("/conversations")
@jwt_required()
def start_conversation():
    """Start a new conversation about an item, or return the existing one."""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    convo, created = message_service.start_conversation(user_id, data["item_id"])
    return jsonify(convo.to_dict()), 201 if created else 200


@messages_bp.get("/conversations/<int:convo_id>")
@jwt_required()
def get_messages(convo_id):
    """Get all messages in a conversation, ordered chronologically."""
    msgs = message_service.get_messages(convo_id)
    return jsonify(msgs)


@messages_bp.post("/conversations/<int:convo_id>")
@jwt_required()
def send_message(convo_id):
    """Send a text message or image in a conversation."""
    user_id = int(get_jwt_identity())
    body = ""
    image_url = None
    if request.content_type and "multipart/form-data" in request.content_type:
        body = (request.form.get("body") or "").strip()
        file = request.files.get("image")
        if file and file.filename:
            try:
                upload_dir = current_app.config["MESSAGE_UPLOAD_FOLDER"]
                image_url = save_message_image(file, upload_dir)
            except ValueError as e:
                return jsonify({"error": str(e)}), 400
    else:
        data = request.get_json(silent=True) or {}
        body = (data.get("body") or "").strip()

    if not body and not image_url:
        return jsonify({"error": "Message body or image is required."}), 400

    try:
        msg = message_service.send_message(convo_id, user_id, body=body, image_url=image_url)
    except PermissionError as e:
        return jsonify({"error": str(e)}), 403
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    return jsonify(msg.to_dict()), 201


@messages_bp.put("/<int:msg_id>")
@jwt_required()
def edit_message(msg_id):
    """Edit a message's text content. Only the sender can edit."""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    try:
        msg = message_service.edit_message(msg_id, user_id, data.get("body", ""))
        return jsonify(msg.to_dict())
    except PermissionError:
        return jsonify({"error": "Forbidden"}), 403
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@messages_bp.delete("/<int:msg_id>")
@jwt_required()
def delete_message(msg_id):
    """Soft-delete a message. Only the sender can delete."""
    user_id = int(get_jwt_identity())
    try:
        message_service.delete_message(msg_id, user_id)
        return "", 204
    except PermissionError:
        return jsonify({"error": "Forbidden"}), 403


@messages_bp.get("/unread-count")
@jwt_required()
def unread_count():
    """Return the total number of unread messages for the authenticated user."""
    user_id = int(get_jwt_identity())
    count = message_service.get_unread_count(user_id)
    return jsonify({"unread_count": count})


@messages_bp.post("/conversations/<int:convo_id>/read")
@jwt_required()
def mark_read(convo_id):
    """Mark all messages in a conversation as read for the authenticated user."""
    user_id = int(get_jwt_identity())
    message_service.mark_conversation_read(convo_id, user_id)
    return jsonify({"ok": True})
