from .conftest import signup, get_token, create_item


# ── CRUD ─────────────────────────────────────────────────────

def test_create_item(client):
    token = get_token(client)
    resp = client.post("/api/items", json={
        "title": "Laptop", "category": "Electronics", "price_cents": 50000,
        "condition": "Like New", "location": "San Francisco",
        "description": "MacBook Pro", "listing_type": "offering",
    }, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["title"] == "Laptop"
    assert data["price"] == 50000
    assert data["seller_id"] is not None


def test_create_item_without_auth(client):
    resp = client.post("/api/items", json={
        "title": "Laptop", "category": "Electronics", "price_cents": 5000,
        "condition": "Good", "location": "Tokyo",
    })
    assert resp.status_code == 401


def test_create_item_missing_required_fields(client):
    token = get_token(client)
    resp = client.post("/api/items", json={
        "title": "",
    }, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 400
    assert "fields" in resp.get_json()


def test_create_item_invalid_category(client):
    token = get_token(client)
    resp = client.post("/api/items", json={
        "title": "Thing", "category": "InvalidCat", "price_cents": 100,
        "condition": "Good", "location": "Tokyo",
    }, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 400


def test_get_single_item(client):
    token = get_token(client)
    item = create_item(client, token, title="Desk")
    resp = client.get(f"/api/items/{item['id']}")
    assert resp.status_code == 200
    assert resp.get_json()["title"] == "Desk"


def test_get_nonexistent_item(client):
    resp = client.get("/api/items/99999")
    assert resp.status_code == 404


def test_update_own_item(client):
    token = get_token(client)
    item = create_item(client, token, title="Old Title")
    resp = client.put(f"/api/items/{item['id']}", json={"title": "New Title"},
                      headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.get_json()["title"] == "New Title"


def test_update_other_users_item(client):
    token1 = get_token(client, email="owner@uni.minerva.edu")
    item = create_item(client, token1)
    token2 = get_token(client, email="other@uni.minerva.edu")
    resp = client.put(f"/api/items/{item['id']}", json={"title": "Hijacked"},
                      headers={"Authorization": f"Bearer {token2}"})
    assert resp.status_code == 403


def test_update_without_auth(client):
    token = get_token(client)
    item = create_item(client, token)
    resp = client.put(f"/api/items/{item['id']}", json={"title": "No Auth"})
    assert resp.status_code == 401


def test_delete_own_item(client):
    token = get_token(client)
    item = create_item(client, token)
    resp = client.delete(f"/api/items/{item['id']}",
                         headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 204
    assert client.get(f"/api/items/{item['id']}").status_code == 404


def test_delete_without_auth(client):
    token = get_token(client)
    item = create_item(client, token)
    resp = client.delete(f"/api/items/{item['id']}")
    assert resp.status_code == 401


def test_delete_other_users_item(client):
    token1 = get_token(client, email="owner2@uni.minerva.edu")
    item = create_item(client, token1)
    token2 = get_token(client, email="thief@uni.minerva.edu")
    resp = client.delete(f"/api/items/{item['id']}",
                         headers={"Authorization": f"Bearer {token2}"})
    assert resp.status_code == 403


# ── Search ───────────────────────────────────────────────────

def test_search_by_title(client):
    token = get_token(client)
    create_item(client, token, title="Rice Cooker")
    create_item(client, token, title="Desk Lamp")
    data = client.get("/api/items?q=rice").get_json()
    assert len(data["items"]) == 1
    assert data["items"][0]["title"] == "Rice Cooker"


def test_search_by_description(client):
    token = get_token(client)
    create_item(client, token, title="Lamp", description="Bright LED light")
    create_item(client, token, title="Pot", description="Cast iron")
    data = client.get("/api/items?q=LED").get_json()
    assert len(data["items"]) == 1
    assert data["items"][0]["title"] == "Lamp"


def test_search_case_insensitive(client):
    token = get_token(client)
    create_item(client, token, title="UPPERCASE ITEM")
    data = client.get("/api/items?q=uppercase").get_json()
    assert len(data["items"]) == 1


def test_search_no_match(client):
    token = get_token(client)
    create_item(client, token)
    data = client.get("/api/items?q=nonexistent").get_json()
    assert len(data["items"]) == 0


def test_search_empty_returns_all(client):
    # q="" is treated as falsy by the backend and skips the search filter.
    # If that logic changes to `if q is not None`, this test will catch it.
    token = get_token(client)
    create_item(client, token, title="A")
    create_item(client, token, title="B")
    data = client.get("/api/items?q=").get_json()
    assert len(data["items"]) == 2


# ── Filters ──────────────────────────────────────────────────

def test_filter_by_listing_type(client):
    token = get_token(client)
    create_item(client, token, title="Sell", listing_type="offering")
    create_item(client, token, title="Want", listing_type="request")
    data = client.get("/api/items?listing_type=offering").get_json()
    assert all(i["listing_type"] == "offering" for i in data["items"])
    assert len(data["items"]) == 1


def test_filter_by_city(client):
    token = get_token(client)
    create_item(client, token, title="Tokyo Item", location="Tokyo")
    create_item(client, token, title="Seoul Item", location="Seoul")
    data = client.get("/api/items?city=Tokyo").get_json()
    assert len(data["items"]) == 1
    assert data["items"][0]["location"] == "Tokyo"


def test_filter_by_category(client):
    token = get_token(client)
    create_item(client, token, title="Phone", category="Electronics")
    create_item(client, token, title="Chair", category="Furniture")
    data = client.get("/api/items?category=Furniture").get_json()
    assert len(data["items"]) == 1
    assert data["items"][0]["title"] == "Chair"


def test_compose_multiple_filters(client):
    token = get_token(client)
    create_item(client, token, title="Tokyo Phone", category="Electronics", location="Tokyo", listing_type="offering")
    create_item(client, token, title="Seoul Phone", category="Electronics", location="Seoul", listing_type="offering")
    create_item(client, token, title="Tokyo Chair", category="Furniture", location="Tokyo", listing_type="offering")
    create_item(client, token, title="Tokyo Request", category="Electronics", location="Tokyo", listing_type="request")
    data = client.get("/api/items?city=Tokyo&category=Electronics&listing_type=offering").get_json()
    assert len(data["items"]) == 1
    assert data["items"][0]["title"] == "Tokyo Phone"


# ── Sort ─────────────────────────────────────────────────────

def test_sort_newest(client):
    token = get_token(client)
    create_item(client, token, title="First")
    create_item(client, token, title="Second")
    data = client.get("/api/items?sort=newest").get_json()
    assert data["items"][0]["title"] == "Second"


def test_sort_oldest(client):
    token = get_token(client)
    create_item(client, token, title="First")
    create_item(client, token, title="Second")
    data = client.get("/api/items?sort=oldest").get_json()
    assert data["items"][0]["title"] == "First"


def test_sort_price_asc(client):
    token = get_token(client)
    create_item(client, token, title="Expensive", price_cents=10000)
    create_item(client, token, title="Cheap", price_cents=100)
    data = client.get("/api/items?sort=price_asc").get_json()
    assert data["items"][0]["title"] == "Cheap"


def test_sort_price_desc(client):
    token = get_token(client)
    create_item(client, token, title="Expensive", price_cents=10000)
    create_item(client, token, title="Cheap", price_cents=100)
    data = client.get("/api/items?sort=price_desc").get_json()
    assert data["items"][0]["title"] == "Expensive"


# ── Price Range ──────────────────────────────────────────────

def test_price_range_min_only(client):
    token = get_token(client)
    create_item(client, token, title="Cheap", price_cents=500)
    create_item(client, token, title="Mid", price_cents=5000)
    create_item(client, token, title="Expensive", price_cents=50000)
    data = client.get("/api/items?min_price=5000").get_json()
    titles = [i["title"] for i in data["items"]]
    assert "Cheap" not in titles
    assert "Mid" in titles
    assert "Expensive" in titles



def test_price_range_max_only(client):
    token = get_token(client)
    create_item(client, token, title="Cheap", price_cents=500)
    create_item(client, token, title="Expensive", price_cents=50000)
    data = client.get("/api/items?max_price=5000").get_json()
    titles = [i["title"] for i in data["items"]]
    assert "Cheap" in titles
    assert "Expensive" not in titles



def test_price_range_both(client):
    token = get_token(client)
    create_item(client, token, title="Too Cheap", price_cents=100)
    create_item(client, token, title="Just Right", price_cents=3000)
    create_item(client, token, title="Too Expensive", price_cents=50000)
    data = client.get("/api/items?min_price=1000&max_price=10000").get_json()
    assert len(data["items"]) == 1
    assert data["items"][0]["title"] == "Just Right"



def test_price_range_composes_with_other_filters(client):
    token = get_token(client)
    create_item(client, token, title="Cheap Phone", category="Electronics", price_cents=1000)
    create_item(client, token, title="Expensive Phone", category="Electronics", price_cents=50000)
    create_item(client, token, title="Cheap Chair", category="Furniture", price_cents=1000)
    data = client.get("/api/items?category=Electronics&max_price=10000").get_json()
    assert len(data["items"]) == 1
    assert data["items"][0]["title"] == "Cheap Phone"


# ── Sold Item Deprioritization ───────────────────────────────


def test_sold_items_appear_after_active(client):
    token = get_token(client)
    active = create_item(client, token, title="Active Item")
    sold = create_item(client, token, title="Sold Item")
    client.put(f"/api/items/{sold['id']}", json={"status": "sold"},
               headers={"Authorization": f"Bearer {token}"})
    data = client.get("/api/items?sort=newest").get_json()
    titles = [i["title"] for i in data["items"]]
    assert titles.index("Active Item") < titles.index("Sold Item")



def test_sold_items_at_bottom_regardless_of_sort(client):
    token = get_token(client)
    create_item(client, token, title="Cheap Active", price_cents=100)
    sold = create_item(client, token, title="Cheap Sold", price_cents=50)
    client.put(f"/api/items/{sold['id']}", json={"status": "sold"},
               headers={"Authorization": f"Bearer {token}"})
    data = client.get("/api/items?sort=price_asc").get_json()
    items = data["items"]
    assert items[-1]["title"] == "Cheap Sold"


# ── Pagination ───────────────────────────────────────────────

def test_pagination_has_more(client):
    token = get_token(client)
    for i in range(5):
        create_item(client, token, title=f"Item {i}")
    data = client.get("/api/items?page=1&per_page=3").get_json()
    assert len(data["items"]) == 3
    assert data["has_more"] is True
    assert data["total"] == 5


def test_pagination_last_page(client):
    token = get_token(client)
    for i in range(5):
        create_item(client, token, title=f"Item {i}")
    data = client.get("/api/items?page=2&per_page=3").get_json()
    assert len(data["items"]) == 2
    assert data["has_more"] is False


# ── Categories + Cities Endpoints ────────────────────────────

def test_get_categories(client):
    data = client.get("/api/categories").get_json()
    assert "Electronics" in data
    assert "Furniture" in data
    assert isinstance(data, list)


def test_get_cities(client):
    token = get_token(client)
    create_item(client, token, location="Tokyo")
    create_item(client, token, title="B", location="Seoul")
    create_item(client, token, title="C", location="Tokyo")
    data = client.get("/api/cities").get_json()
    assert "Tokyo" in data
    assert "Seoul" in data
    assert data == sorted(data)
    assert data.count("Tokyo") == 1


def test_get_cities_empty(client):
    data = client.get("/api/cities").get_json()
    assert data == []


# ── Purchased From/Year ───────────────────────────────────────

def test_create_item_with_purchase_details(client):
    token = get_token(client)
    resp = client.post("/api/items", json={
        "title": "IKEA Desk", "category": "Furniture", "price_cents": 8000,
        "condition": "Good", "location": "San Francisco", "listing_type": "offering",
        "purchased_from": "IKEA", "purchased_year": "2024",
    }, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["purchased_from"] == "IKEA"
    assert data["purchased_year"] == "2024"


def test_update_purchase_details(client):
    token = get_token(client, email="purchaseupdate@uni.minerva.edu")
    item = create_item(client, token)
    resp = client.put(f"/api/items/{item['id']}", json={
        "purchased_from": "Amazon", "purchased_year": "2023",
    }, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.get_json()["purchased_from"] == "Amazon"
    assert resp.get_json()["purchased_year"] == "2023"


def test_purchased_year_rejects_invalid(client):
    token = get_token(client, email="badyear@uni.minerva.edu")
    resp = client.post("/api/items", json={
        "title": "Lamp", "category": "Electronics", "price_cents": 1000,
        "condition": "Good", "location": "Tokyo", "listing_type": "offering",
        "purchased_year": "abcd",
    }, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 400
    assert "purchased_year" in resp.get_json().get("fields", {})


# ── Seller Profile ───────────────────────────────────────────

def test_item_includes_seller_info(client):
    token = get_token(client, first_name="Seller", last_name="One",
                      city="San Francisco", cohort="M28")
    item = create_item(client, token)
    data = client.get(f"/api/items/{item['id']}").get_json()
    assert "seller" in data
    assert data["seller"]["first_name"] == "Seller"
    assert data["seller"]["last_name"] == "One"
    assert data["seller"]["city"] == "San Francisco"
    assert data["seller"]["cohort"] == "M28"
    assert "created_at" in data["seller"]


# ── Synonym Search ─────────────────────────────────────────

def test_synonym_search_earbuds_finds_headphones(client):
    token = get_token(client, email="syn1@uni.minerva.edu")
    create_item(client, token, title="Wireless Headphones", category="Electronics")
    resp = client.get("/api/items?q=earbuds")
    items = resp.get_json()["items"]
    assert any("Headphones" in i["title"] for i in items)


def test_synonym_search_headphones_finds_earbuds(client):
    token = get_token(client, email="syn2@uni.minerva.edu")
    create_item(client, token, title="Bluetooth Earbuds", category="Electronics")
    resp = client.get("/api/items?q=headphones")
    items = resp.get_json()["items"]
    assert any("Earbuds" in i["title"] for i in items)


def test_synonym_search_laptop_finds_notebook(client):
    token = get_token(client, email="syn3@uni.minerva.edu")
    create_item(client, token, title="Lenovo Notebook", category="Electronics")
    resp = client.get("/api/items?q=laptop")
    items = resp.get_json()["items"]
    assert any("Notebook" in i["title"] for i in items)


def test_synonym_search_couch_finds_sofa(client):
    token = get_token(client, email="syn4@uni.minerva.edu")
    create_item(client, token, title="IKEA Sofa", category="Furniture")
    resp = client.get("/api/items?q=couch")
    items = resp.get_json()["items"]
    assert any("Sofa" in i["title"] for i in items)


def test_synonym_search_tv_finds_television(client):
    token = get_token(client, email="syn5@uni.minerva.edu")
    create_item(client, token, title="Samsung Television 42 inch", category="Electronics")
    resp = client.get("/api/items?q=tv")
    items = resp.get_json()["items"]
    assert any("Television" in i["title"] for i in items)


def test_nonsyonym_search_returns_no_false_matches(client):
    token = get_token(client, email="syn6@uni.minerva.edu")
    create_item(client, token, title="Rice Cooker", category="Kitchen")
    resp = client.get("/api/items?q=laptop")
    items = resp.get_json()["items"]
    assert not any("Rice Cooker" in i["title"] for i in items)
