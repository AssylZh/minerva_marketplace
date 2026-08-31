"""Message service: conversations, messaging, read receipts, and unread tracking."""

from datetime import datetime, timezone
from ..models import db, Conversation, Message, Item


def get_conversations(user_id):
    """Get all conversations for a user, ordered by most recent first.

    Only conversations with at least one non-deleted message are returned.
    Each entry includes the other participant's name, the item title,
    the last message preview, and an ``has_unread`` flag.

    Args:
        user_id: The authenticated user's ID.

    Returns:
        List of conversation summary dicts.
    """
    convos = Conversation.query.filter(
        (Conversation.buyer_id == user_id) | (Conversation.seller_id == user_id)
    ).order_by(Conversation.created_at.desc()).all()

    result = []
    for c in convos:
        other = c.seller if c.buyer_id == user_id else c.buyer
        last_msg = next((m for m in reversed(c.messages) if not m.deleted_at), None)
        # Hide empty conversations from both sides
        if not last_msg:
            continue
        has_unread = any(
            m.sender_id != user_id and not m.read_at and not m.deleted_at
            for m in c.messages
        )
        result.append({
            "id": c.id,
            "item_id": c.item_id,
            "item_title": c.item.title,
            "other_user": other.first_name,
            "last_message": (last_msg.body or "") if last_msg else None,
            "last_message_has_image": bool(last_msg.image_url) if last_msg else False,
            "has_unread": has_unread,
        })
    return result


def start_conversation(buyer_id, item_id):
    """Start a new conversation about an item, or return an existing one.

    Args:
        buyer_id: The user initiating the conversation.
        item_id: The item being discussed.

    Returns:
        Tuple of (Conversation instance, bool created).
    """
    item = Item.query.get_or_404(item_id)

    existing = Conversation.query.filter_by(
        item_id=item.id, buyer_id=buyer_id
    ).first()
    if existing:
        return existing, False

    convo = Conversation(item_id=item.id, buyer_id=buyer_id, seller_id=item.seller_id)
    db.session.add(convo)
    db.session.commit()
    return convo, True


def get_messages(convo_id):
    """Get all messages in a conversation, ordered chronologically.

    Args:
        convo_id: The conversation to retrieve messages from.

    Returns:
        List of serialized message dicts.
    """
    convo = Conversation.query.get_or_404(convo_id)
    return [m.to_dict() for m in convo.messages]


def send_message(convo_id, sender_id, body="", image_url=None):
    """Send a message in a conversation.

    Verifies that the sender is a participant (buyer or seller) in the
    conversation before allowing the message.

    Args:
        convo_id: Target conversation ID.
        sender_id: The authenticated user sending the message.
        body: Text content of the message.
        image_url: Optional URL of an attached image.

    Returns:
        The newly created Message instance.

    Raises:
        PermissionError: If the sender is not a conversation participant.
        ValueError: If both body and image_url are empty.
    """
    convo = Conversation.query.get_or_404(convo_id)
    if sender_id not in (convo.buyer_id, convo.seller_id):
        raise PermissionError("You are not a participant in this conversation.")
    text = (body or "").strip()
    if not text and not image_url:
        raise ValueError("Message body or image is required.")
    msg = Message(
        conversation_id=convo_id,
        sender_id=sender_id,
        body=text,
        image_url=image_url,
    )
    db.session.add(msg)
    db.session.commit()
    return msg


def get_unread_count(user_id):
    """Count unread messages for a user across all conversations.

    A message is considered unread if it was sent by another user and
    has no ``read_at`` timestamp.

    Args:
        user_id: The authenticated user's ID.

    Returns:
        Integer count of unread messages.
    """
    count = Message.query.join(Conversation).filter(
        ((Conversation.buyer_id == user_id) | (Conversation.seller_id == user_id)),
        Message.sender_id != user_id,
        Message.read_at.is_(None)
    ).count()
    return count


def edit_message(msg_id, user_id, body):
    """Edit the body of an existing message.

    Only the original sender can edit their own messages.  Editing a
    soft-deleted message is not permitted.

    Args:
        msg_id: The message to edit.
        user_id: The authenticated user requesting the edit.
        body: New message body text.

    Returns:
        The updated Message instance.

    Raises:
        PermissionError: If the user is not the sender.
        ValueError: If the new body is empty or the message is deleted.
    """
    msg = Message.query.get_or_404(msg_id)
    if msg.sender_id != user_id:
        raise PermissionError()
    if msg.deleted_at:
        raise ValueError("Cannot edit a deleted message.")
    if not body.strip():
        raise ValueError("Message cannot be empty.")
    msg.body = body.strip()
    db.session.commit()
    return msg


def delete_message(msg_id, user_id):
    """Soft-delete a message by setting its ``deleted_at`` timestamp.

    Only the original sender can delete their own messages.

    Args:
        msg_id: The message to delete.
        user_id: The authenticated user requesting deletion.

    Raises:
        PermissionError: If the user is not the sender.
    """
    msg = Message.query.get_or_404(msg_id)
    if msg.sender_id != user_id:
        raise PermissionError()
    msg.deleted_at = datetime.now(timezone.utc)
    db.session.commit()


def mark_conversation_read(convo_id, user_id):
    """Mark all messages from the other participant as read.

    Sets ``read_at`` on every unread message in the conversation that
    was not sent by the current user.

    Args:
        convo_id: The conversation to mark as read.
        user_id: The authenticated user performing the action.
    """
    messages = Message.query.filter_by(conversation_id=convo_id).filter(
        Message.sender_id != user_id,
        Message.read_at.is_(None)
    ).all()
    if not messages:
        return
    for msg in messages:
        msg.read_at = datetime.now(timezone.utc)
    db.session.commit()
