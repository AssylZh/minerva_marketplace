"""SQLAlchemy ORM models for Minerva Marketplace.

Defines the four core entities: User, Item, Conversation, and Message.
Each model provides a ``to_dict()`` method for JSON serialization.
"""

from datetime import datetime, timezone
from . import db


class User(db.Model):
    """A registered Minerva student who can list and purchase items."""

    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    city = db.Column(db.String(100), nullable=False)
    cohort = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    items = db.relationship("Item", back_populates="seller", lazy=True)

    def to_dict(self):
        """Serialize user to a dict (excludes password_hash)."""
        return {
            "id": self.id,
            "email": self.email,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "city": self.city,
            "cohort": self.cohort,
            "created_at": self.created_at.isoformat(),
        }


class Item(db.Model):
    """A marketplace listing (offering or request) posted by a user."""

    __tablename__ = "items"
    __table_args__ = (
        db.CheckConstraint("price >= 0", name="ck_items_price_nonneg"),
        db.CheckConstraint("status IN ('active', 'sold')", name="ck_items_status"),
    )

    id = db.Column(db.Integer, primary_key=True)
    seller_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    price = db.Column(db.Integer, nullable=False)  # stored in cents (e.g. 5000 = $50.00)
    currency = db.Column(db.String(10), nullable=False, default="USD")
    category = db.Column(db.String(100), nullable=False, index=True)
    condition = db.Column(db.String(50), nullable=False)
    listing_type = db.Column(db.String(20), nullable=False, default="offering")
    status = db.Column(db.String(50), nullable=False, default="active")
    location = db.Column(db.String(255), nullable=True, index=True)
    image_url = db.Column(db.String(500), nullable=True)
    purchased_from = db.Column(db.String(255), nullable=True)
    purchased_year = db.Column(db.String(10), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    seller = db.relationship("User", back_populates="items")

    def to_dict(self):
        """Serialize item to a dict, including nested seller profile if loaded."""
        result = {
            "id": self.id,
            "seller_id": self.seller_id,
            "title": self.title,
            "description": self.description,
            "price": self.price,
            "currency": self.currency,
            "category": self.category,
            "condition": self.condition,
            "listing_type": self.listing_type,
            "status": self.status,
            "location": self.location,
            "image_url": self.image_url,
            "purchased_from": self.purchased_from,
            "purchased_year": self.purchased_year,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
        if self.seller:
            result["seller"] = {
                "id": self.seller.id,
                "first_name": self.seller.first_name,
                "last_name": self.seller.last_name,
                "city": self.seller.city,
                "cohort": self.seller.cohort,
                "created_at": self.seller.created_at.isoformat(),
            }
        return result


class Conversation(db.Model):
    """A conversation thread between a buyer and seller about an item."""

    __tablename__ = "conversations"
    __table_args__ = (
        db.UniqueConstraint("buyer_id", "item_id", name="uq_conversation_buyer_item"),
    )

    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey("items.id"), nullable=False, index=True)
    buyer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    seller_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    item = db.relationship("Item", backref=db.backref("conversations", cascade="all, delete-orphan"))
    buyer = db.relationship("User", foreign_keys=[buyer_id], backref="buying_conversations")
    seller = db.relationship("User", foreign_keys=[seller_id], backref="selling_conversations")
    messages = db.relationship("Message", back_populates="conversation", order_by="Message.created_at", cascade="all, delete-orphan")

    def to_dict(self):
        """Serialize conversation metadata (does not include messages)."""
        return {
            "id": self.id,
            "item_id": self.item_id,
            "item_title": self.item.title,
            "buyer_id": self.buyer_id,
            "seller_id": self.seller_id,
            "created_at": self.created_at.isoformat(),
        }


class Message(db.Model):
    """A single message within a conversation. Supports soft delete via deleted_at."""

    __tablename__ = "messages"
    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey("conversations.id"), nullable=False, index=True)
    sender_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    body = db.Column(db.Text, nullable=False)
    image_url = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    read_at = db.Column(db.DateTime, nullable=True)
    deleted_at = db.Column(db.DateTime, nullable=True)
    conversation = db.relationship("Conversation", back_populates="messages")
    sender = db.relationship("User", backref="messages")

    def to_dict(self):
        """Serialize message. Body is replaced with '[deleted]' if soft-deleted."""
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "sender_id": self.sender_id,
            "sender_name": self.sender.first_name,
            "body": "[deleted]" if self.deleted_at else self.body,
            "deleted": bool(self.deleted_at),
            "image_url": None if self.deleted_at else self.image_url,
            "created_at": self.created_at.isoformat(),
            "read_at": self.read_at.isoformat() if self.read_at else None,
        }
