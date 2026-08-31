from .conftest import signup, get_token


def test_health_ok(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "ok"


def test_signup_accepts_minerva_email(client):
    resp = signup(client, email="valid@uni.minerva.edu")
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["ok"] is True
    assert "token" in data
    assert "user" in data
    assert data["user"]["email"] == "valid@uni.minerva.edu"


def test_signup_accepts_minerva_edu_email(client):
    resp = signup(client, email="valid@minerva.edu")
    assert resp.status_code == 201
    assert resp.get_json()["ok"] is True


def test_signup_rejects_non_minerva_email(client):
    resp = signup(client, email="test@gmail.com")
    assert resp.status_code == 400
    assert resp.get_json()["ok"] is False


def test_signup_rejects_duplicate_email(client):
    signup(client, email="dup@uni.minerva.edu")
    resp = signup(client, email="dup@uni.minerva.edu")
    assert resp.status_code == 409
    assert resp.get_json()["ok"] is False


def test_signup_rejects_missing_fields(client):
    resp = client.post("/api/auth/signup", json={
        "email": "missing@uni.minerva.edu",
        "password": "securepass123",
    })
    assert resp.status_code == 400


def test_signup_rejects_short_password(client):
    resp = signup(client, email="short@uni.minerva.edu", password="ab")
    assert resp.status_code == 400


def test_signup_rejects_invalid_city(client):
    resp = signup(client, email="city@uni.minerva.edu", city="Atlantis")
    assert resp.status_code == 400


def test_login_correct_password(client):
    signup(client, email="login@uni.minerva.edu", password="securepass123")
    resp = client.post("/api/auth/login", json={
        "email": "login@uni.minerva.edu", "password": "securepass123",
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["ok"] is True
    assert "token" in data


def test_login_wrong_password(client):
    signup(client, email="wrong@uni.minerva.edu", password="securepass123")
    resp = client.post("/api/auth/login", json={
        "email": "wrong@uni.minerva.edu", "password": "badpassword",
    })
    assert resp.status_code == 401


def test_login_nonexistent_user(client):
    resp = client.post("/api/auth/login", json={
        "email": "nobody@uni.minerva.edu", "password": "whatever",
    })
    assert resp.status_code == 401


def test_login_rejects_non_minerva_email(client):
    resp = client.post("/api/auth/login", json={
        "email": "test@gmail.com", "password": "whatever",
    })
    assert resp.status_code == 400


def test_signup_rejects_fake_minerva_domain(client):
    resp = signup(client, email="test@fake-minerva.edu")
    assert resp.status_code == 400
    assert resp.get_json()["ok"] is False
