"""Authentication service: signup, login, email validation, and password policy."""

from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token
from ..models import db, User

CITIES = ["San Francisco", "Buenos Aires", "Hyderabad", "Taipei", "Seoul", "Tokyo", "Berlin"]


def is_valid_minerva_email(email):
    """Check whether *email* belongs to a Minerva domain (@minerva.edu or @uni.minerva.edu)."""
    email = (email or "").strip().lower()
    return email.endswith("@minerva.edu") or email.endswith("@uni.minerva.edu")


def validate_password(password):
    """Raise ``ValueError`` if *password* does not meet the minimum-length policy."""
    if password is None or len(password) < 6:
        raise ValueError("Password must be at least 6 characters.")


def signup(data):
    """Register a new user.

    Validates the Minerva email, required profile fields, and password
    strength.  On success returns a JWT and user profile.

    Returns:
        Tuple of (response_dict, http_status_code).
    """
    email = data.get("email", "")
    password = data.get("password", "")
    first_name = (data.get("first_name") or "").strip()
    last_name = (data.get("last_name") or "").strip()
    city = (data.get("city") or "").strip()
    cohort = (data.get("cohort") or "").strip()

    if not is_valid_minerva_email(email):
        return {"ok": False, "error": "Use your @uni.minerva.edu email."}, 400
    if not first_name:
        return {"ok": False, "error": "First name is required."}, 400
    if not last_name:
        return {"ok": False, "error": "Last name is required."}, 400
    if not city or city not in CITIES:
        return {"ok": False, "error": "Please select a valid city."}, 400
    if not cohort:
        return {"ok": False, "error": "Cohort is required (e.g. M27)."}, 400
    try:
        validate_password(password)
    except ValueError as e:
        return {"ok": False, "error": str(e)}, 400

    if User.query.filter_by(email=email).first():
        return {"ok": False, "error": "Email already registered. Please log in."}, 409

    new_user = User(
        email=email,
        password_hash=generate_password_hash(password, method="pbkdf2:sha256"),
        first_name=first_name,
        last_name=last_name,
        city=city,
        cohort=cohort,
    )
    db.session.add(new_user)
    db.session.commit()

    token = create_access_token(identity=str(new_user.id))
    return {"ok": True, "token": token, "user": new_user.to_dict()}, 201


def login(data):
    """Authenticate a user by email and password.

    Returns a JWT on success.  Error responses intentionally avoid
    revealing whether the email exists (prevents user enumeration).

    Returns:
        Tuple of (response_dict, http_status_code).
    """
    email = data.get("email", "")
    password = data.get("password", "")

    if not is_valid_minerva_email(email):
        return {"ok": False, "error": "Use your @uni.minerva.edu email."}, 400

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return {"ok": False, "error": "Invalid email or password."}, 401

    token = create_access_token(identity=str(user.id))
    return {"ok": True, "token": token, "user": user.to_dict()}, 200
