from .conftest import get_token, create_item


def test_start_conversation(client):
    seller_token = get_token(client, email="seller@uni.minerva.edu")
    item = create_item(client, seller_token)
    buyer_token = get_token(client, email="buyer@uni.minerva.edu")

    resp = client.post("/api/messages/conversations",
                       json={"item_id": item["id"]},
                       headers={"Authorization": f"Bearer {buyer_token}"})
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["item_id"] == item["id"]


def test_start_conversation_returns_existing(client):
    seller_token = get_token(client, email="seller2@uni.minerva.edu")
    item = create_item(client, seller_token)
    buyer_token = get_token(client, email="buyer2@uni.minerva.edu")

    resp1 = client.post("/api/messages/conversations",
                        json={"item_id": item["id"]},
                        headers={"Authorization": f"Bearer {buyer_token}"})
    resp2 = client.post("/api/messages/conversations",
                        json={"item_id": item["id"]},
                        headers={"Authorization": f"Bearer {buyer_token}"})
    assert resp1.get_json()["id"] == resp2.get_json()["id"]
    assert resp2.status_code == 200


def test_send_and_get_messages(client):
    seller_token = get_token(client, email="seller3@uni.minerva.edu")
    item = create_item(client, seller_token)
    buyer_token = get_token(client, email="buyer3@uni.minerva.edu")

    convo = client.post("/api/messages/conversations",
                        json={"item_id": item["id"]},
                        headers={"Authorization": f"Bearer {buyer_token}"}).get_json()

    resp = client.post(f"/api/messages/conversations/{convo['id']}",
                       json={"body": "Is this still available?"},
                       headers={"Authorization": f"Bearer {buyer_token}"})
    assert resp.status_code == 201
    assert resp.get_json()["body"] == "Is this still available?"

    msgs = client.get(f"/api/messages/conversations/{convo['id']}",
                      headers={"Authorization": f"Bearer {buyer_token}"}).get_json()
    assert len(msgs) == 1
    assert msgs[0]["body"] == "Is this still available?"


def test_get_conversations(client):
    seller_token = get_token(client, email="seller4@uni.minerva.edu")
    item = create_item(client, seller_token)
    buyer_token = get_token(client, email="buyer4@uni.minerva.edu")

    convo = client.post("/api/messages/conversations",
                        json={"item_id": item["id"]},
                        headers={"Authorization": f"Bearer {buyer_token}"}).get_json()

    # Must send a message for the conversation to appear in the list
    client.post(f"/api/messages/conversations/{convo['id']}",
                json={"body": "Hi there"},
                headers={"Authorization": f"Bearer {buyer_token}"})

    convos = client.get("/api/messages/conversations",
                        headers={"Authorization": f"Bearer {buyer_token}"}).get_json()
    assert len(convos) >= 1
    assert convos[0]["item_id"] == item["id"]


def test_unread_count(client):
    seller_token = get_token(client, email="seller5@uni.minerva.edu")
    item = create_item(client, seller_token)
    buyer_token = get_token(client, email="buyer5@uni.minerva.edu")

    convo = client.post("/api/messages/conversations",
                        json={"item_id": item["id"]},
                        headers={"Authorization": f"Bearer {buyer_token}"}).get_json()

    client.post(f"/api/messages/conversations/{convo['id']}",
                json={"body": "Hello seller"},
                headers={"Authorization": f"Bearer {buyer_token}"})

    resp = client.get("/api/messages/unread-count",
                      headers={"Authorization": f"Bearer {seller_token}"})
    assert resp.status_code == 200
    assert resp.get_json()["unread_count"] >= 1


def test_conversations_require_auth(client):
    resp = client.get("/api/messages/conversations")
    assert resp.status_code == 401


def test_send_message_requires_auth(client):
    resp = client.post("/api/messages/conversations/1", json={"body": "test"})
    assert resp.status_code == 401


def test_edit_own_message(client):
    seller_token = get_token(client, email="editseller@uni.minerva.edu")
    item = create_item(client, seller_token)
    buyer_token = get_token(client, email="editbuyer@uni.minerva.edu")

    convo = client.post("/api/messages/conversations",
                        json={"item_id": item["id"]},
                        headers={"Authorization": f"Bearer {buyer_token}"}).get_json()
    msg = client.post(f"/api/messages/conversations/{convo['id']}",
                      json={"body": "original"},
                      headers={"Authorization": f"Bearer {buyer_token}"}).get_json()

    resp = client.put(f"/api/messages/{msg['id']}",
                      json={"body": "edited"},
                      headers={"Authorization": f"Bearer {buyer_token}"})
    assert resp.status_code == 200
    assert resp.get_json()["body"] == "edited"


def test_edit_other_users_message_forbidden(client):
    seller_token = get_token(client, email="editforbidseller@uni.minerva.edu")
    item = create_item(client, seller_token)
    buyer_token = get_token(client, email="editforbidbuyer@uni.minerva.edu")

    convo = client.post("/api/messages/conversations",
                        json={"item_id": item["id"]},
                        headers={"Authorization": f"Bearer {buyer_token}"}).get_json()
    msg = client.post(f"/api/messages/conversations/{convo['id']}",
                      json={"body": "mine"},
                      headers={"Authorization": f"Bearer {buyer_token}"}).get_json()

    resp = client.put(f"/api/messages/{msg['id']}",
                      json={"body": "hijacked"},
                      headers={"Authorization": f"Bearer {seller_token}"})
    assert resp.status_code == 403


def test_delete_message_soft_deletes(client):
    seller_token = get_token(client, email="delseller@uni.minerva.edu")
    item = create_item(client, seller_token)
    buyer_token = get_token(client, email="delbuyer@uni.minerva.edu")

    convo = client.post("/api/messages/conversations",
                        json={"item_id": item["id"]},
                        headers={"Authorization": f"Bearer {buyer_token}"}).get_json()
    msg = client.post(f"/api/messages/conversations/{convo['id']}",
                      json={"body": "delete me"},
                      headers={"Authorization": f"Bearer {buyer_token}"}).get_json()

    resp = client.delete(f"/api/messages/{msg['id']}",
                         headers={"Authorization": f"Bearer {buyer_token}"})
    assert resp.status_code == 204

    msgs = client.get(f"/api/messages/conversations/{convo['id']}",
                      headers={"Authorization": f"Bearer {buyer_token}"}).get_json()
    deleted_msg = next(m for m in msgs if m["id"] == msg["id"])
    assert deleted_msg["body"] == "[deleted]"
    assert deleted_msg["deleted"] is True


def test_delete_other_users_message_forbidden(client):
    seller_token = get_token(client, email="delforbidseller@uni.minerva.edu")
    item = create_item(client, seller_token)
    buyer_token = get_token(client, email="delforbidbuyer@uni.minerva.edu")

    convo = client.post("/api/messages/conversations",
                        json={"item_id": item["id"]},
                        headers={"Authorization": f"Bearer {buyer_token}"}).get_json()
    msg = client.post(f"/api/messages/conversations/{convo['id']}",
                      json={"body": "not yours"},
                      headers={"Authorization": f"Bearer {buyer_token}"}).get_json()

    resp = client.delete(f"/api/messages/{msg['id']}",
                         headers={"Authorization": f"Bearer {seller_token}"})
    assert resp.status_code == 403
