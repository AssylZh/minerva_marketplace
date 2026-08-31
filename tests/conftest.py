"""Shared test fixtures for the Minerva Marketplace backend test suite."""

import pytest
from backend.app import create_app
from backend.models import db as _db


@pytest.fixture
def app():
    """Create a test application with an in-memory SQLite database."""
    app = create_app(testing=True)
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    with app.app_context():
        _db.create_all()
        yield app
        _db.session.remove()
        _db.drop_all()


@pytest.fixture
def client(app):
    """Return a Flask test client bound to the test app."""
    return app.test_client()


@pytest.fixture
def db(app):
    """Return the SQLAlchemy database instance for direct model access."""
    return _db


def signup(client, email="test@uni.minerva.edu", password="securepass123",
           first_name="Test", last_name="User", city="San Francisco", cohort="M28"):
    """Register a new user and return the response."""
    return client.post("/api/auth/signup", json={
        "email": email, "password": password,
        "first_name": first_name, "last_name": last_name,
        "city": city, "cohort": cohort,
    })


def get_token(client, email="test@uni.minerva.edu", **kwargs):
    """Register a user and return their JWT token."""
    resp = signup(client, email=email, **kwargs)
    data = resp.get_json()
    assert "token" in data, f"Signup failed: {data}"
    return data["token"]


def create_item(client, token, title="Test Item", category="Electronics",
                price_cents=5000, condition="Good", location="San Francisco",
                description="A test item", listing_type="offering"):
    """Create an item listing and return its serialized dict."""
    resp = client.post("/api/items", json={
        "title": title, "category": category, "price_cents": price_cents,
        "condition": condition, "location": location, "description": description,
        "listing_type": listing_type,
    }, headers={"Authorization": f"Bearer {token}"})
    return resp.get_json()
