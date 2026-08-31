from .conftest import get_token, create_item


def test_dashboard_returns_listings(client):
    token = get_token(client, email="dash@uni.minerva.edu")
    create_item(client, token, title="Active Item")
    sold = create_item(client, token, title="Sold Item")
    client.put(f"/api/items/{sold['id']}", json={"status": "sold"},
               headers={"Authorization": f"Bearer {token}"})

    resp = client.get("/api/me/dashboard",
                      headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.get_json()
    assert len(data["active_listings"]) == 1
    assert len(data["sold_listings"]) == 1
    assert data["stats"]["active_count"] == 1
    assert data["stats"]["sold_count"] == 1


def test_dashboard_stats_include_unread(client):
    token = get_token(client, email="dashseller@uni.minerva.edu")
    item = create_item(client, token)
    buyer_token = get_token(client, email="dashbuyer@uni.minerva.edu")

    convo = client.post("/api/messages/conversations",
                        json={"item_id": item["id"]},
                        headers={"Authorization": f"Bearer {buyer_token}"}).get_json()
    client.post(f"/api/messages/conversations/{convo['id']}",
                json={"body": "Is this available?"},
                headers={"Authorization": f"Bearer {buyer_token}"})

    resp = client.get("/api/me/dashboard",
                      headers={"Authorization": f"Bearer {token}"})
    data = resp.get_json()
    assert data["stats"]["unread_messages"] >= 1


def test_dashboard_only_returns_own_data(client):
    token1 = get_token(client, email="user1@uni.minerva.edu")
    token2 = get_token(client, email="user2@uni.minerva.edu")
    create_item(client, token1, title="User1 Item")
    create_item(client, token2, title="User2 Item")

    data1 = client.get("/api/me/dashboard",
                       headers={"Authorization": f"Bearer {token1}"}).get_json()
    data2 = client.get("/api/me/dashboard",
                       headers={"Authorization": f"Bearer {token2}"}).get_json()

    assert all(i["title"] == "User1 Item" for i in data1["active_listings"])
    assert all(i["title"] == "User2 Item" for i in data2["active_listings"])


def test_dashboard_recent_messages(client):
    seller_token = get_token(client, email="msgseller@uni.minerva.edu")
    item = create_item(client, seller_token)
    buyer_token = get_token(client, email="msgbuyer@uni.minerva.edu")

    convo = client.post("/api/messages/conversations",
                        json={"item_id": item["id"]},
                        headers={"Authorization": f"Bearer {buyer_token}"}).get_json()
    client.post(f"/api/messages/conversations/{convo['id']}",
                json={"body": "Hello"},
                headers={"Authorization": f"Bearer {buyer_token}"})

    data = client.get("/api/me/dashboard",
                      headers={"Authorization": f"Bearer {seller_token}"}).get_json()
    assert len(data["recent_messages"]) >= 1


def test_dashboard_requires_auth(client):
    resp = client.get("/api/me/dashboard")
    assert resp.status_code == 401


def test_dashboard_empty_for_new_user(client):
    token = get_token(client, email="newuser@uni.minerva.edu")
    data = client.get("/api/me/dashboard",
                      headers={"Authorization": f"Bearer {token}"}).get_json()
    assert data["active_listings"] == []
    assert data["sold_listings"] == []
    assert data["stats"]["active_count"] == 0
    assert data["stats"]["sold_count"] == 0
    assert data["stats"]["unread_messages"] == 0
