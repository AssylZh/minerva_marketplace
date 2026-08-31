"""Authentication routes: signup and login endpoints."""

from flask import Blueprint, jsonify, request
from ..services import auth_service

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/signup")
def signup():
    """Create a new user account with a Minerva email address."""
    data = request.get_json(silent=True) or {}
    result, status = auth_service.signup(data)
    return jsonify(result), status


@auth_bp.post("/login")
def login():
    """Authenticate with email and password, returning a JWT on success."""
    data = request.get_json(silent=True) or {}
    result, status = auth_service.login(data)
    return jsonify(result), status
