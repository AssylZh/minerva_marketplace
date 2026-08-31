"""Item service: CRUD operations, search with synonym expansion, filtering,
sorting, pagination, image uploads, and dashboard helpers."""

import os
import uuid
from flask import current_app
from sqlalchemy import or_
from werkzeug.utils import secure_filename
from ..models import db, Item

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

VALID_CATEGORIES = ["Appliance", "Furniture", "Electronics", "Textbooks", "Kitchen", "Books", "Clothing", "Other"]

SYNONYMS = {
    "earbuds": "headphones",
    "headphones": "earbuds",
    "laptop": "notebook",
    "notebook": "laptop",
    "sofa": "couch",
    "couch": "sofa",
    "fridge": "refrigerator",
    "refrigerator": "fridge",
    "phone": "smartphone",
    "smartphone": "phone",
    "bike": "bicycle",
    "bicycle": "bike",
    "tv": "television",
    "television": "tv",
}
VALID_CONDITIONS = ["New", "Like New", "Good", "Fair"]
VALID_LISTING_TYPES = ["offering", "request"]
VALID_SORT_OPTIONS = {"newest", "oldest", "price_asc", "price_desc"}


def validate_item_data(data, require_all=True):
    """Validate item fields for create or update.

    Args:
        data: Dict of field values from the request.
        require_all: True for create (all required fields must be present),
                     False for update (only validate provided fields).

    Returns:
        Dict mapping field names to error messages.  Empty dict means valid.
    """
    errors = {}

    title = data.get("title", "").strip() if data.get("title") else ""
    if require_all and not title:
        errors["title"] = "Title is required."

    category = data.get("category", "").strip() if data.get("category") else ""
    if require_all and not category:
        errors["category"] = "Category is required."
    elif category and category not in VALID_CATEGORIES:
        errors["category"] = f"Invalid category. Must be one of: {', '.join(VALID_CATEGORIES)}"

    price_raw = data.get("price_cents")
    if require_all and price_raw is None:
        errors["price"] = "Price is required."
    elif price_raw is not None:
        try:
            price_val = int(price_raw)
            if price_val < 0:
                errors["price"] = "Price cannot be negative."
        except (ValueError, TypeError):
            errors["price"] = "Price must be a number."

    condition = data.get("condition", "")
    if condition and condition not in VALID_CONDITIONS:
        errors["condition"] = f"Invalid condition. Must be one of: {', '.join(VALID_CONDITIONS)}"

    listing_type = data.get("listing_type", "")
    if listing_type and listing_type not in VALID_LISTING_TYPES:
        errors["listing_type"] = "Must be 'offering' or 'request'."

    status = data.get("status", "")
    if status and status not in ("active", "sold"):
        errors["status"] = "Status must be 'active' or 'sold'."

    purchased_year = data.get("purchased_year", "").strip() if data.get("purchased_year") else ""
    if purchased_year and (not purchased_year.isdigit() or len(purchased_year) != 4):
        errors["purchased_year"] = "Must be a 4-digit year."

    location = data.get("location", "").strip() if data.get("location") else ""
    if require_all and not location:
        errors["location"] = "Location is required."

    return errors


def list_items(city=None, listing_type=None, category=None, search_query=None,
               sort="newest", page=1, per_page=20, min_price=None, max_price=None):
    """Query items with composable filters, synonym-expanded search, sort, and pagination.

    Sold items are always pushed to the bottom of results regardless of
    the chosen sort order.

    Args:
        city: Filter by item location.
        listing_type: Filter by 'offering' or 'request'.
        category: Filter by category name.
        search_query: Free-text keyword search (matches title and description).
                      Automatically expands common synonyms (e.g. earbuds ↔ headphones).
        sort: One of 'newest', 'oldest', 'price_asc', 'price_desc'.
        page: 1-based page number.
        per_page: Items per page (capped at 100).
        min_price: Minimum price in cents (inclusive).
        max_price: Maximum price in cents (inclusive).

    Returns:
        Dict with keys: items, total, page, per_page, has_more.
    """
    from sqlalchemy import case

    per_page = min(per_page, 100)
    if page < 1:
        page = 1
    if sort not in VALID_SORT_OPTIONS:
        sort = "newest"

    query = Item.query

    if city:
        query = query.filter(Item.location == city)
    if listing_type:
        query = query.filter(Item.listing_type == listing_type)
    if category:
        query = query.filter(Item.category == category)
    if search_query:
        pattern = f"%{search_query}%"
        canonical = SYNONYMS.get(search_query.lower())
        if canonical:
            alt_pattern = f"%{canonical}%"
            query = query.filter(
                or_(
                    Item.title.ilike(pattern) | Item.description.ilike(pattern),
                    Item.title.ilike(alt_pattern) | Item.description.ilike(alt_pattern),
                )
            )
        else:
            query = query.filter(Item.title.ilike(pattern) | Item.description.ilike(pattern))
    if min_price is not None:
        query = query.filter(Item.price >= min_price)
    if max_price is not None:
        query = query.filter(Item.price <= max_price)

    sold_order = case((Item.status == "sold", 1), else_=0)

    if sort == "oldest":
        query = query.order_by(sold_order, Item.created_at.asc())
    elif sort == "price_asc":
        query = query.order_by(sold_order, Item.price.asc())
    elif sort == "price_desc":
        query = query.order_by(sold_order, Item.price.desc())
    else:
        query = query.order_by(sold_order, Item.created_at.desc())

    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()

    return {
        "items": [item.to_dict() for item in items],
        "total": total,
        "page": page,
        "per_page": per_page,
        "has_more": (page * per_page) < total,
    }


def get_item(item_id):
    """Get a single item by ID.  Returns 404 if not found."""
    return Item.query.get_or_404(item_id)


def create_item(seller_id, data):
    """Create a new item listing and persist it to the database.

    Args:
        seller_id: ID of the authenticated user creating the listing.
        data: Validated item fields dict.

    Returns:
        The newly created Item ORM instance.
    """
    item = Item(
        seller_id=seller_id,
        title=data.get("title", "").strip(),
        category=data.get("category", "").strip(),
        price=int(data.get("price_cents", 0)),
        currency="USD",
        condition=data.get("condition", "Good"),
        listing_type=data.get("listing_type", "offering"),
        location=data.get("location", "").strip(),
        description=data.get("description", "").strip(),
        image_url=data.get("image_url"),
        purchased_from=data.get("purchased_from", "").strip() or None,
        purchased_year=data.get("purchased_year", "").strip() or None,
    )
    db.session.add(item)
    db.session.commit()
    return item


def update_item(item, data):
    """Update an existing item with provided fields.

    Only fields present in *data* are modified; others are left unchanged.

    Returns:
        The updated Item ORM instance.
    """
    if "title" in data:
        item.title = data["title"]
    if "category" in data:
        item.category = data["category"]
    if "price_cents" in data:
        item.price = int(data["price_cents"])
    if "condition" in data:
        item.condition = data["condition"]
    if "location" in data:
        item.location = data["location"]
    if "description" in data:
        item.description = data["description"]
    if "status" in data:
        item.status = data["status"]
    if "listing_type" in data:
        item.listing_type = data["listing_type"]
    if "image_url" in data:
        item.image_url = data["image_url"]
    if "purchased_from" in data:
        item.purchased_from = data["purchased_from"].strip() or None
    if "purchased_year" in data:
        item.purchased_year = data["purchased_year"].strip() or None
    db.session.commit()
    return item


def delete_item(item):
    """Delete an item and cascade-delete its conversations and messages."""
    db.session.delete(item)
    db.session.commit()


def save_upload(file):
    """Validate and save an uploaded image file.

    Uses Cloudinary when the ``CLOUDINARY_URL`` environment variable is set,
    otherwise falls back to local filesystem storage (dev only).

    Args:
        file: A Werkzeug ``FileStorage`` object.

    Returns:
        The public URL of the saved image, or None if no file was provided.

    Raises:
        ValueError: If the file extension is not allowed or the file exceeds 5 MB.
    """
    if not file or not file.filename:
        return None

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"File type not allowed. Use: {', '.join(ALLOWED_EXTENSIONS)}")

    file.seek(0, 2)
    size = file.tell()
    file.seek(0)
    if size > MAX_FILE_SIZE:
        raise ValueError("File too large. Maximum size is 5 MB.")

    cloudinary_url = os.environ.get("CLOUDINARY_URL")
    if cloudinary_url:
        import cloudinary
        import cloudinary.uploader
        cloudinary.config(cloudinary_url=cloudinary_url)
        result = cloudinary.uploader.upload(file, folder="minerva-marketplace")
        return result["secure_url"]

    upload_dir = os.environ.get("UPLOAD_DIR") or os.path.join(current_app.root_path, "static", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.{ext}"
    file.save(os.path.join(upload_dir, filename))
    return f"/static/uploads/{filename}"


def get_user_listings(user_id):
    """Return (active, sold) item lists for a user's dashboard.

    Args:
        user_id: The ID of the user whose listings to retrieve.

    Returns:
        Tuple of (active_items_list, sold_items_list) where each entry
        is a serialized item dict.
    """
    active = [i.to_dict() for i in Item.query.filter_by(seller_id=user_id, status="active").order_by(Item.created_at.desc()).all()]
    sold = [i.to_dict() for i in Item.query.filter_by(seller_id=user_id, status="sold").order_by(Item.created_at.desc()).all()]
    return active, sold


def get_categories():
    """Return the list of valid item categories."""
    return VALID_CATEGORIES


def get_cities():
    """Return a sorted list of distinct cities where items are currently listed."""
    rows = db.session.query(Item.location).filter(Item.location.isnot(None)).distinct().all()
    return sorted([r[0] for r in rows if r[0]])
