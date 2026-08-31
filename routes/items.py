"""Item routes: CRUD, search, filtering, sorting, pagination, and category/city lookups."""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from flask_jwt_extended.exceptions import NoAuthorizationError
from jwt.exceptions import PyJWTError
from ..services import item_service

items_bp = Blueprint("items", __name__, url_prefix="/api")


@items_bp.get("/items")
def get_items():
    """List items with optional filters, search, sort, and pagination.

    Query params: q, category, city, listing_type, sort, min_price,
    max_price, page, per_page.
    """
    try:
        min_price = int(request.args["min_price"]) if "min_price" in request.args else None
        max_price = int(request.args["max_price"]) if "max_price" in request.args else None
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 20))
    except (ValueError, TypeError):
        return jsonify({"error": "min_price, max_price, page, and per_page must be integers."}), 400

    if page < 1:
        page = 1

    items_data = item_service.list_items(
        city=request.args.get("city"),
        listing_type=request.args.get("listing_type"),
        category=request.args.get("category"),
        search_query=request.args.get("q", "").strip() or None,
        sort=request.args.get("sort", "newest"),
        page=page,
        per_page=per_page,
        min_price=min_price,
        max_price=max_price,
    )
    return jsonify(items_data)


@items_bp.get("/items/<int:item_id>")
def get_item(item_id):
    """Return a single item by ID, including seller profile info."""
    item = item_service.get_item(item_id)
    return jsonify(item.to_dict())


@items_bp.post("/items")
def create_item():
    """Create a new item listing. Accepts JSON or multipart form data with image."""
    try:
        verify_jwt_in_request()
        seller_id = int(get_jwt_identity())
    except (NoAuthorizationError, PyJWTError):
        return jsonify({"error": "Unauthorized"}), 401

    # Handle both JSON and FormData (multipart) submissions
    if request.content_type and "multipart" in request.content_type:
        data = request.form.to_dict()
        if "price_cents" in data:
            data["price_cents"] = int(data["price_cents"])
    else:
        data = request.get_json()

    errors = item_service.validate_item_data(data, require_all=True)
    if errors:
        return jsonify({"error": "Validation failed", "fields": errors}), 400

    # Handle image upload via service layer
    image_url = None
    if "image" in request.files:
        try:
            image_url = item_service.save_upload(request.files["image"])
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
    data["image_url"] = image_url

    item = item_service.create_item(seller_id, data)
    return jsonify(item.to_dict()), 201


@items_bp.put("/items/<int:item_id>")
def update_item(item_id):
    """Update an existing item listing. Only the owner can update."""
    try:
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
    except (NoAuthorizationError, PyJWTError):
        return jsonify({"error": "Unauthorized"}), 401

    item = item_service.get_item(item_id)
    if item.seller_id != user_id:
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json()
    errors = item_service.validate_item_data(data, require_all=False)
    if errors:
        return jsonify({"error": "Validation failed", "fields": errors}), 400

    item = item_service.update_item(item, data)
    return jsonify(item.to_dict())


@items_bp.delete("/items/<int:item_id>")
def delete_item(item_id):
    """Delete an item listing and its associated conversations. Owner only."""
    try:
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
    except (NoAuthorizationError, PyJWTError):
        return jsonify({"error": "Unauthorized"}), 401

    item = item_service.get_item(item_id)
    if item.seller_id != user_id:
        return jsonify({"error": "Forbidden"}), 403

    item_service.delete_item(item)
    return "", 204


@items_bp.get("/categories")
def get_categories():
    """Return the list of valid item categories."""
    return jsonify(item_service.get_categories())


@items_bp.get("/cities")
def get_cities():
    """Return a sorted list of distinct cities where items are listed."""
    return jsonify(item_service.get_cities())
