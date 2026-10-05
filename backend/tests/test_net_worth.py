"""
test_net_worth.py
-----------------
Endpoint tests for the Net Worth tracker (/api/net-worth/*): CRUD happy paths,
the SQL-aggregated summary (category rollups + mortgage rollup + lifetime gain),
snapshots, validation, and cross-tenant IDOR isolation across every nw_* table.

DB-backed — skipped without TEST_DATABASE_URL (the `db`/`auth_client` fixtures
handle that). Mirrors the saved_calculators IDOR harness (test_idor.py).
"""

import pytest


def _new_user(app, get_csrf_token, email):
    """A fresh logged-in client (own cookie jar) + its CSRF token for `email`."""
    client = app.test_client()
    token = get_csrf_token(client)
    resp = client.post(
        "/api/auth/register",
        headers={"X-CSRF-Token": token},
        json={"email": email, "password": "Testpass123"},
    )
    assert resp.status_code == 201, resp.get_data(as_text=True)
    return client, token


# --------------------------------------------------------------------------- #
# CRUD happy paths
# --------------------------------------------------------------------------- #
def test_asset_crud(auth_client, get_csrf_token):
    client, _ = auth_client
    token = get_csrf_token(client)
    h = {"X-CSRF-Token": token}

    # Create
    resp = client.post("/api/net-worth/assets", headers=h, json={
        "asset_type": "cash", "name": "Checking", "current_value": 1500.50,
    })
    assert resp.status_code == 201, resp.get_data(as_text=True)
    item = resp.get_json()["item"]
    assert item["name"] == "Checking"
    assert item["current_value"] == 1500.50  # NUMERIC -> float
    asset_id = item["id"]

    # List
    resp = client.get("/api/net-worth/assets")
    assert resp.status_code == 200
    assert len(resp.get_json()["items"]) == 1

    # Update (partial)
    resp = client.put(f"/api/net-worth/assets/{asset_id}", headers=h,
                      json={"current_value": 2000})
    assert resp.status_code == 200
    assert resp.get_json()["item"]["current_value"] == 2000.0
    assert resp.get_json()["item"]["name"] == "Checking"  # untouched

    # Delete
    resp = client.delete(f"/api/net-worth/assets/{asset_id}", headers=h)
    assert resp.status_code == 204
    resp = client.get("/api/net-worth/assets")
    assert resp.get_json()["items"] == []


def test_all_resource_endpoints_create(auth_client, get_csrf_token):
    """Smoke each resource's POST so every table + schema is exercised."""
    client, _ = auth_client
    h = {"X-CSRF-Token": get_csrf_token(client)}

    cases = {
        "assets": {"asset_type": "brokerage", "name": "Vanguard", "current_value": 10000},
        "liabilities": {"liability_type": "credit_card", "name": "Visa", "current_balance": 500},
        "investments": {"ticker": "vti", "quantity": 10, "cost_basis": 200,
                        "asset_class": "etf"},
        "real-estate": {"property_name": "Condo", "property_type": "primary",
                        "current_value": 300000, "mortgage_balance": 200000},
    }
    for path, body in cases.items():
        resp = client.post(f"/api/net-worth/{path}", headers=h, json=body)
        assert resp.status_code == 201, f"{path}: {resp.get_data(as_text=True)}"


# --------------------------------------------------------------------------- #
# Summary aggregation
# --------------------------------------------------------------------------- #
def test_summary_rollups(auth_client, get_csrf_token):
    client, _ = auth_client
    h = {"X-CSRF-Token": get_csrf_token(client)}

    client.post("/api/net-worth/assets", headers=h, json={
        "asset_type": "cash", "name": "Cash", "current_value": 5000, "cost_basis": 5000})
    client.post("/api/net-worth/assets", headers=h, json={
        "asset_type": "custom", "name": "Watch", "current_value": 3000, "cost_basis": 1000})
    client.post("/api/net-worth/liabilities", headers=h, json={
        "liability_type": "loan", "name": "Car loan", "current_balance": 8000})
    client.post("/api/net-worth/real-estate", headers=h, json={
        "property_name": "Home", "property_type": "primary",
        "current_value": 400000, "purchase_price": 350000, "mortgage_balance": 250000})

    resp = client.get("/api/net-worth/summary")
    assert resp.status_code == 200
    s = resp.get_json()

    # assets = 5000 (liquid) + 3000 (collectible) + 400000 (RE) = 408000
    assert s["total_assets"] == 408000.0
    # liabilities = 8000 + mortgage 250000 = 258000
    assert s["total_liabilities"] == 258000.0
    assert s["net_worth"] == 150000.0
    assert s["categories"]["liquid_assets"]["total"] == 5000.0
    assert s["categories"]["collectibles"]["total"] == 3000.0
    assert s["categories"]["real_estate"]["total"] == 400000.0
    # cost basis = 5000 + 1000 + 350000 = 356000 -> gain = 408000 - 356000
    assert s["lifetime_gain"] == 52000.0


def test_snapshot_captures_current_net_worth(auth_client, get_csrf_token):
    client, _ = auth_client
    h = {"X-CSRF-Token": get_csrf_token(client)}
    client.post("/api/net-worth/assets", headers=h, json={
        "asset_type": "cash", "name": "Cash", "current_value": 1000})

    resp = client.post("/api/net-worth/snapshots", headers=h, json={})
    assert resp.status_code == 201, resp.get_data(as_text=True)
    snap = resp.get_json()["item"]
    assert snap["net_worth"] == 1000.0
    assert snap["snapshot_date"]  # server-defaulted to today

    resp = client.get("/api/net-worth/snapshots")
    assert len(resp.get_json()["items"]) == 1


# --------------------------------------------------------------------------- #
# Validation
# --------------------------------------------------------------------------- #
def test_invalid_enum_rejected(auth_client, get_csrf_token):
    client, _ = auth_client
    h = {"X-CSRF-Token": get_csrf_token(client)}
    resp = client.post("/api/net-worth/assets", headers=h, json={
        "asset_type": "gold_bars", "name": "X", "current_value": 1})
    assert resp.status_code == 422
    assert "asset_type" in resp.get_json()["errors"]


def test_negative_value_rejected(auth_client, get_csrf_token):
    client, _ = auth_client
    h = {"X-CSRF-Token": get_csrf_token(client)}
    resp = client.post("/api/net-worth/assets", headers=h, json={
        "asset_type": "cash", "name": "X", "current_value": -5})
    assert resp.status_code == 422


def test_write_requires_auth(client):
    """No session -> 401 (login_required) before any DB work."""
    resp = client.get("/api/net-worth/assets")
    assert resp.status_code == 401


# --------------------------------------------------------------------------- #
# IDOR — cross-tenant isolation on every resource
# --------------------------------------------------------------------------- #
@pytest.mark.parametrize("path,body", [
    ("assets", {"asset_type": "cash", "name": "A", "current_value": 1}),
    ("liabilities", {"liability_type": "loan", "name": "L", "current_balance": 1}),
    ("investments", {"ticker": "x", "quantity": 1, "cost_basis": 1, "asset_class": "stock"}),
    ("real-estate", {"property_name": "P", "property_type": "primary", "current_value": 1}),
])
def test_idor_cannot_touch_other_users_rows(app, db, get_csrf_token, path, body):
    # Two users on separate clients (separate cookie jars / sessions).
    client_a, token_a = _new_user(app, get_csrf_token, "owner@example.com")
    client_b, token_b = _new_user(app, get_csrf_token, "attacker@example.com")

    # User A creates a row
    resp = client_a.post(f"/api/net-worth/{path}", headers={"X-CSRF-Token": token_a}, json=body)
    assert resp.status_code == 201, resp.get_data(as_text=True)
    row_id = resp.get_json()["item"]["id"]

    # B sees none of A's rows
    assert client_b.get(f"/api/net-worth/{path}").get_json()["items"] == []
    # B cannot update or delete A's row -> 404 (existence not leaked)
    assert client_b.put(f"/api/net-worth/{path}/{row_id}",
                        headers={"X-CSRF-Token": token_b}, json=body).status_code == 404
    assert client_b.delete(f"/api/net-worth/{path}/{row_id}",
                          headers={"X-CSRF-Token": token_b}).status_code == 404
    # A's row is intact
    assert len(client_a.get(f"/api/net-worth/{path}").get_json()["items"]) == 1


# --------------------------------------------------------------------------- #
# Snapshot editing — correcting history (#318)
# --------------------------------------------------------------------------- #
def _take_snapshot(client, h, value):
    """Give the user a portfolio worth `value` and snapshot it."""
    resp = client.post("/api/net-worth/assets", headers=h, json={
        "asset_type": "cash", "name": f"Cash {value}", "current_value": value})
    assert resp.status_code == 201
    resp = client.post("/api/net-worth/snapshots", headers=h, json={})
    assert resp.status_code == 201
    return resp.get_json()["item"]


def test_snapshot_update_recomputes_net_worth(auth_client, get_csrf_token):
    client, _ = auth_client
    h = {"X-CSRF-Token": get_csrf_token(client)}
    snap = _take_snapshot(client, h, 1000)

    # Editing a total recomputes net_worth server-side; net_worth in the
    # payload is ignored (unknown field -> 422 would break correction UIs, so
    # the schema simply doesn't define it — marshmallow rejects unknowns).
    resp = client.put(f"/api/net-worth/snapshots/{snap['id']}", headers=h,
                      json={"total_assets": 201000, "total_liabilities": 1000})
    assert resp.status_code == 200, resp.get_data(as_text=True)
    item = resp.get_json()["item"]
    assert item["total_assets"] == 201000.0
    assert item["net_worth"] == 200000.0

    # Date + notes are editable on their own; totals stay put.
    resp = client.put(f"/api/net-worth/snapshots/{snap['id']}", headers=h,
                      json={"snapshot_date": "2026-01-15", "notes": "corrected"})
    assert resp.status_code == 200
    item = resp.get_json()["item"]
    assert item["snapshot_date"] == "2026-01-15"
    assert item["net_worth"] == 200000.0


def test_snapshot_update_rejects_net_worth_field(auth_client, get_csrf_token):
    client, _ = auth_client
    h = {"X-CSRF-Token": get_csrf_token(client)}
    snap = _take_snapshot(client, h, 1000)
    resp = client.put(f"/api/net-worth/snapshots/{snap['id']}", headers=h,
                      json={"net_worth": 999999})
    assert resp.status_code == 422  # unknown field — never user-writable


def test_snapshot_update_empty_payload_400(auth_client, get_csrf_token):
    client, _ = auth_client
    h = {"X-CSRF-Token": get_csrf_token(client)}
    snap = _take_snapshot(client, h, 1000)
    resp = client.put(f"/api/net-worth/snapshots/{snap['id']}", headers=h, json={})
    assert resp.status_code == 400


def test_snapshot_delete(auth_client, get_csrf_token):
    client, _ = auth_client
    h = {"X-CSRF-Token": get_csrf_token(client)}
    snap = _take_snapshot(client, h, 1000)
    resp = client.delete(f"/api/net-worth/snapshots/{snap['id']}", headers=h)
    assert resp.status_code == 204
    assert client.get("/api/net-worth/snapshots").get_json()["items"] == []
    # Deleting again -> 404
    resp = client.delete(f"/api/net-worth/snapshots/{snap['id']}", headers=h)
    assert resp.status_code == 404


def test_snapshot_idor_isolation(app, db, get_csrf_token):
    client_a, token_a = _new_user(app, get_csrf_token, "snap-owner@example.com")
    client_b, token_b = _new_user(app, get_csrf_token, "snap-attacker@example.com")
    snap = _take_snapshot(client_a, {"X-CSRF-Token": token_a}, 1000)

    assert client_b.put(f"/api/net-worth/snapshots/{snap['id']}",
                        headers={"X-CSRF-Token": token_b},
                        json={"total_assets": 0}).status_code == 404
    assert client_b.delete(f"/api/net-worth/snapshots/{snap['id']}",
                           headers={"X-CSRF-Token": token_b}).status_code == 404
    assert len(client_a.get("/api/net-worth/snapshots").get_json()["items"]) == 1
