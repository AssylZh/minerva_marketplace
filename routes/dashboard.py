"""Dashboard route: aggregated view of a user's listings, stats, and messages."""

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..services import item_service, message_service

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/me")


@dashboard_bp.get("/dashboard")
@jwt_required()
def get_dashboard():
    """Return the authenticated user's active/sold listings, stats, and recent messages."""
    user_id = int(get_jwt_identity())

    active, sold = item_service.get_user_listings(user_id)
    conversations = message_service.get_conversations(user_id)
    unread = message_service.get_unread_count(user_id)

    return jsonify({
        "active_listings": active,
        "sold_listings": sold,
        "stats": {
            "active_count": len(active),
            "sold_count": len(sold),
            "unread_messages": unread,
        },
        "recent_messages": conversations[:5],
    })
