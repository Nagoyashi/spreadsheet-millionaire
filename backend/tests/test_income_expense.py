"""
test_income_expense.py
----------------------
Endpoint tests for the Income & Expense tracker (/api/income-expense/*):
transaction CRUD, year/month filtering, the SQL-aggregated summary, per-type
category validation, and cross-tenant IDOR isolation.

DB-backed — skipped without TEST_DATABASE_URL (via the db/auth_client fixtures).
"""

import pytest


def _new_user(app, get_csrf_token, email):
    client = app.test_client()
    token = get_csrf_token(client)
    resp = client.post(
        "/api/auth/register",
        headers={"X-CSRF-Token": token},
        json={"email": email, "password": "Testpass123"},
    )
    assert resp.status_code == 201, resp.get_data(as_text=True)
    return client, token


def _txn(**over):
    base = {"type": "expense", "category": "food", "amount": 42.50, "occurred_on": "2026-03-15"}
    base.update(over)
    return base


# --------------------------------------------------------------------------- #
# CRUD
# --------------------------------------------------------------------------- #
def test_transaction_crud(auth_client, get_csrf_token):
    client, _ = auth_client
    h = {"X-CSRF-Token": get_csrf_token(client)}

    resp = client.post("/api/income-expense/transactions", headers=h, json=_txn())
    assert resp.status_code == 201, resp.get_data(as_text=True)
    item = resp.get_json()["item"]
    assert item["amount"] == 42.50  # NUMERIC -> float
    assert item["occurred_on"] == "2026-03-15"  # DATE -> ISO
    txn_id = item["id"]

    assert len(client.get("/api/income-expense/transactions").get_json()["items"]) == 1

    resp = client.put(f"/api/income-expense/transactions/{txn_id}", headers=h, json={"amount": 50})
    assert resp.status_code == 200
    assert resp.get_json()["item"]["amount"] == 50.0

    assert client.delete(f"/api/income-expense/transactions/{txn_id}", headers=h).status_code == 204
    assert client.get("/api/income-expense/transactions").get_json()["items"] == []


def test_year_month_filter(auth_client, get_csrf_token):
    client, _ = auth_client
    h = {"X-CSRF-Token": get_csrf_token(client)}
    client.post("/api/income-expense/transactions", headers=h, json=_txn(occurred_on="2026-03-15"))
    client.post("/api/income-expense/transactions", headers=h, json=_txn(occurred_on="2025-11-02"))

    assert len(client.get("/api/income-expense/transactions?year=2026").get_json()["items"]) == 1
    assert len(client.get("/api/income-expense/transactions?year=2026&month=3").get_json()["items"]) == 1
    assert len(client.get("/api/income-expense/transactions?year=2026&month=4").get_json()["items"]) == 0


# --------------------------------------------------------------------------- #
# Summary
# --------------------------------------------------------------------------- #
def test_summary_aggregation(auth_client, get_csrf_token):
    client, _ = auth_client
    h = {"X-CSRF-Token": get_csrf_token(client)}
    client.post("/api/income-expense/transactions", headers=h,
                json=_txn(type="income", category="salary", amount=5000, occurred_on="2026-01-31"))
    client.post("/api/income-expense/transactions", headers=h,
                json=_txn(type="expense", category="housing", amount=1500, occurred_on="2026-01-10"))
    client.post("/api/income-expense/transactions", headers=h,
                json=_txn(type="expense", category="food", amount=500, occurred_on="2026-02-05"))

    s = client.get("/api/income-expense/summary?year=2026").get_json()
    assert s["year"] == 2026
    assert s["totals"] == {"income": 5000.0, "expense": 2000.0, "net": 3000.0}
    assert s["by_month"][0] == {"month": 1, "income": 5000.0, "expense": 1500.0}  # January
    assert s["by_month"][1]["expense"] == 500.0  # February
    assert s["by_category"]["expense"] == {"housing": 1500.0, "food": 500.0}
    assert s["available_years"] == [2026]


# --------------------------------------------------------------------------- #
# Validation
# --------------------------------------------------------------------------- #
def test_category_must_match_type(auth_client, get_csrf_token):
    client, _ = auth_client
    h = {"X-CSRF-Token": get_csrf_token(client)}
    # 'salary' is an income category — invalid for an expense.
    resp = client.post("/api/income-expense/transactions", headers=h,
                       json=_txn(type="expense", category="salary"))
    assert resp.status_code == 422
    assert "category" in resp.get_json()["errors"]


def test_amount_must_be_positive(auth_client, get_csrf_token):
    client, _ = auth_client
    h = {"X-CSRF-Token": get_csrf_token(client)}
    assert client.post("/api/income-expense/transactions", headers=h,
                       json=_txn(amount=0)).status_code == 422


# --------------------------------------------------------------------------- #
# Recurrence (DDL-migrated columns — see db_init.py)
# --------------------------------------------------------------------------- #
def test_recurrence_defaults_and_roundtrip(auth_client, get_csrf_token):
    client, _ = auth_client
    h = {"X-CSRF-Token": get_csrf_token(client)}

    # Omitting recurrence defaults to a one-off.
    one_off = client.post("/api/income-expense/transactions", headers=h, json=_txn()).get_json()["item"]
    assert one_off["recurrence_unit"] == "none"
    assert one_off["recurrence_interval"] == 1

    # A repeat round-trips its (unit, interval).
    repeating = client.post(
        "/api/income-expense/transactions",
        headers=h,
        json=_txn(recurrence_unit="week", recurrence_interval=2),
    ).get_json()["item"]
    assert repeating["recurrence_unit"] == "week"
    assert repeating["recurrence_interval"] == 2


def test_recurrence_none_normalises_interval(auth_client, get_csrf_token):
    client, _ = auth_client
    h = {"X-CSRF-Token": get_csrf_token(client)}
    # A non-repeating transaction always stores interval 1, whatever was sent.
    item = client.post(
        "/api/income-expense/transactions",
        headers=h,
        json=_txn(recurrence_unit="none", recurrence_interval=9),
    ).get_json()["item"]
    assert item["recurrence_interval"] == 1


def test_invalid_recurrence_is_rejected(auth_client, get_csrf_token):
    client, _ = auth_client
    h = {"X-CSRF-Token": get_csrf_token(client)}
    assert client.post("/api/income-expense/transactions", headers=h,
                       json=_txn(recurrence_unit="fortnight")).status_code == 422
    assert client.post("/api/income-expense/transactions", headers=h,
                       json=_txn(recurrence_unit="day", recurrence_interval=0)).status_code == 422


def test_list_requires_auth(client):
    assert client.get("/api/income-expense/transactions").status_code == 401


# --------------------------------------------------------------------------- #
# IDOR
# --------------------------------------------------------------------------- #
def test_idor_cannot_touch_other_users_transactions(app, db, get_csrf_token):
    client_a, token_a = _new_user(app, get_csrf_token, "owner@example.com")
    client_b, token_b = _new_user(app, get_csrf_token, "attacker@example.com")

    resp = client_a.post("/api/income-expense/transactions",
                        headers={"X-CSRF-Token": token_a}, json=_txn())
    txn_id = resp.get_json()["item"]["id"]

    assert client_b.get("/api/income-expense/transactions").get_json()["items"] == []
    assert client_b.put(f"/api/income-expense/transactions/{txn_id}",
                       headers={"X-CSRF-Token": token_b}, json={"amount": 1}).status_code == 404
    assert client_b.delete(f"/api/income-expense/transactions/{txn_id}",
                          headers={"X-CSRF-Token": token_b}).status_code == 404
    assert len(client_a.get("/api/income-expense/transactions").get_json()["items"]) == 1


# --------------------------------------------------------------------------- #
# Monthly grid (bulk month entry)
# --------------------------------------------------------------------------- #
def _cells(*over):
    return {"cells": list(over)}


def _cell(**over):
    base = {"type": "expense", "category": "food", "amount": 420.50}
    base.update(over)
    return base


def test_month_put_and_get_roundtrip(auth_client, get_csrf_token):
    client, _ = auth_client
    h = {"X-CSRF-Token": get_csrf_token(client)}

    resp = client.put("/api/income-expense/months/2026/3", headers=h,
                      json=_cells(_cell(), _cell(type="income", category="salary", amount=3000)))
    assert resp.status_code == 200, resp.get_data(as_text=True)
    state = resp.get_json()
    assert state["year"] == 2026 and state["month"] == 3
    assert {(c["type"], c["category"], c["amount"]) for c in state["cells"]} == {
        ("expense", "food", 420.50),
        ("income", "salary", 3000.0),
    }

    # GET returns the same state; the aggregate rows land on the first of month
    # as ordinary transactions with source='monthly'.
    assert client.get("/api/income-expense/months/2026/3").get_json() == state
    items = client.get("/api/income-expense/transactions?year=2026&month=3").get_json()["items"]
    assert {(i["occurred_on"], i["source"]) for i in items} == {("2026-03-01", "monthly")}


def test_month_put_replaces_wholesale(auth_client, get_csrf_token):
    client, _ = auth_client
    h = {"X-CSRF-Token": get_csrf_token(client)}

    client.put("/api/income-expense/months/2026/3", headers=h,
               json=_cells(_cell(), _cell(category="transport", amount=99)))
    # Re-save with one cell changed and the other omitted: omitted = cleared.
    resp = client.put("/api/income-expense/months/2026/3", headers=h,
                      json=_cells(_cell(amount=500)))
    cells = resp.get_json()["cells"]
    assert [(c["category"], c["amount"]) for c in cells] == [("food", 500.0)]

    # An empty cells list clears the month entirely; other months are untouched.
    client.put("/api/income-expense/months/2026/4", headers=h, json=_cells(_cell(amount=7)))
    assert client.put("/api/income-expense/months/2026/3", headers=h,
                      json=_cells()).get_json()["cells"] == []
    assert client.get("/api/income-expense/months/2026/4").get_json()["cells"] != []


def test_month_put_is_idempotent(auth_client, get_csrf_token):
    client, _ = auth_client
    h = {"X-CSRF-Token": get_csrf_token(client)}
    body = _cells(_cell(), _cell(type="income", category="salary", amount=3000))

    first = client.put("/api/income-expense/months/2026/3", headers=h, json=body).get_json()
    second = client.put("/api/income-expense/months/2026/3", headers=h, json=body).get_json()
    assert first["cells"] == second["cells"]
    # No row accumulation across re-saves.
    items = client.get("/api/income-expense/transactions?year=2026&month=3").get_json()["items"]
    assert len(items) == 2


def test_month_get_separates_manual_sums(auth_client, get_csrf_token):
    client, _ = auth_client
    h = {"X-CSRF-Token": get_csrf_token(client)}

    client.post("/api/income-expense/transactions", headers=h,
                json=_txn(occurred_on="2026-03-15", amount=10))
    client.post("/api/income-expense/transactions", headers=h,
                json=_txn(occurred_on="2026-03-20", amount=5))
    client.put("/api/income-expense/months/2026/3", headers=h, json=_cells(_cell(amount=100)))

    state = client.get("/api/income-expense/months/2026/3").get_json()
    # Manual rows are summed read-only, never merged into the grid cells.
    assert state["manual_sums"]["expense"]["food"] == 15.0
    assert [(c["category"], c["amount"]) for c in state["cells"]] == [("food", 100.0)]
    # And a month-edited manual row elsewhere doesn't leak in.
    assert state["manual_sums"]["income"] == {}


def test_month_put_validation(auth_client, get_csrf_token):
    client, _ = auth_client
    h = {"X-CSRF-Token": get_csrf_token(client)}

    # Duplicate (type, category) cells rejected.
    assert client.put("/api/income-expense/months/2026/3", headers=h,
                      json=_cells(_cell(), _cell(amount=1))).status_code == 422
    # Category must match the type.
    assert client.put("/api/income-expense/months/2026/3", headers=h,
                      json=_cells(_cell(type="income", category="food"))).status_code == 422
    # Amounts must be positive (a cleared cell is omitted, not zeroed).
    assert client.put("/api/income-expense/months/2026/3", headers=h,
                      json=_cells(_cell(amount=0))).status_code == 422
    # source is server-set — a client sending it is rejected (unknown field).
    assert client.put("/api/income-expense/months/2026/3", headers=h,
                      json=_cells(_cell(source="import"))).status_code == 422
    # Missing body / cells key.
    assert client.put("/api/income-expense/months/2026/3", headers=h,
                      json={}).status_code == 422
    # Nonsense calendar values.
    assert client.get("/api/income-expense/months/2026/13").status_code == 422
    assert client.get("/api/income-expense/months/1500/5").status_code == 422
    assert client.put("/api/income-expense/months/2026/0", headers=h,
                      json=_cells()).status_code == 422


def test_month_endpoints_require_auth(client):
    assert client.get("/api/income-expense/months/2026/3").status_code == 401
    assert client.put("/api/income-expense/months/2026/3",
                      json=_cells()).status_code in (401, 403)  # 403 = CSRF-first


def test_month_idor_isolation(app, db, get_csrf_token):
    client_a, token_a = _new_user(app, get_csrf_token, "grid-owner@example.com")
    client_b, token_b = _new_user(app, get_csrf_token, "grid-attacker@example.com")

    client_a.put("/api/income-expense/months/2026/3",
                 headers={"X-CSRF-Token": token_a}, json=_cells(_cell(amount=777)))

    # B sees an empty month, and B's PUT can't clear A's rows.
    assert client_b.get("/api/income-expense/months/2026/3").get_json()["cells"] == []
    client_b.put("/api/income-expense/months/2026/3",
                 headers={"X-CSRF-Token": token_b}, json=_cells())
    assert client_a.get("/api/income-expense/months/2026/3").get_json()["cells"] != []


def test_summary_includes_monthly_grid_rows(auth_client, get_csrf_token):
    """Regression (#294): aggregate grid rows are ordinary transactions — the
    year summary must fold them in with manual rows, never filter on source."""
    client, _ = auth_client
    h = {"X-CSRF-Token": get_csrf_token(client)}

    client.post("/api/income-expense/transactions", headers=h,
                json=_txn(occurred_on="2026-03-15", amount=12.50))
    client.put("/api/income-expense/months/2026/3", headers=h,
               json=_cells(_cell(amount=400), _cell(type="income", category="salary", amount=3000)))

    summary = client.get("/api/income-expense/summary?year=2026").get_json()
    assert summary["totals"] == {"income": 3000.0, "expense": 412.50, "net": 2587.50}
    assert summary["by_month"][2] == {"month": 3, "income": 3000.0, "expense": 412.50}
    assert summary["by_category"]["expense"]["food"] == 412.50


def test_manual_transactions_default_to_manual_source(auth_client, get_csrf_token):
    client, _ = auth_client
    h = {"X-CSRF-Token": get_csrf_token(client)}
    item = client.post("/api/income-expense/transactions", headers=h,
                       json=_txn()).get_json()["item"]
    assert item["source"] == "manual"
    # And the client can't smuggle a source through the transaction schema.
    assert client.post("/api/income-expense/transactions", headers=h,
                       json=_txn(source="monthly")).status_code == 422


# --------------------------------------------------------------------------- #
# Categories — user-scoped, archive/restore (v0.15.1)
# --------------------------------------------------------------------------- #
def test_categories_seed_defaults_on_first_touch(auth_client):
    client, _ = auth_client
    items = client.get("/api/income-expense/categories").get_json()["items"]
    # 9 expense + 6 income defaults, keys = the pre-v0.15.1 curated slugs.
    assert len(items) == 15
    assert {i["key"] for i in items if i["type"] == "expense"} >= {"housing", "food", "other"}
    assert {i["key"] for i in items if i["type"] == "income"} >= {"salary", "refund", "other"}
    assert all(i["archived"] is False for i in items)
    # Idempotent — a second touch doesn't re-seed.
    assert len(client.get("/api/income-expense/categories").get_json()["items"]) == 15


def test_add_custom_category_and_use_it(auth_client, get_csrf_token):
    client, _ = auth_client
    h = {"X-CSRF-Token": get_csrf_token(client)}

    resp = client.post("/api/income-expense/categories", headers=h,
                       json={"type": "expense", "name": "Strom + Gas"})
    assert resp.status_code == 201, resp.get_data(as_text=True)
    cat = resp.get_json()["item"]
    assert cat["key"] == "strom-gas" and cat["name"] == "Strom + Gas"

    # Usable immediately — individual transaction and grid cell.
    assert client.post("/api/income-expense/transactions", headers=h,
                       json=_txn(category="strom-gas")).status_code == 201
    assert client.put("/api/income-expense/months/2026/3", headers=h,
                      json=_cells(_cell(category="strom-gas"))).status_code == 200


def test_duplicate_active_category_conflicts(auth_client, get_csrf_token):
    client, _ = auth_client
    h = {"X-CSRF-Token": get_csrf_token(client)}
    client.post("/api/income-expense/categories", headers=h,
                json={"type": "expense", "name": "Reisekosten"})
    # Case-insensitive duplicate of an ACTIVE category → 409.
    assert client.post("/api/income-expense/categories", headers=h,
                       json={"type": "expense", "name": "reisekosten"}).status_code == 409
    # Same name on the OTHER type is a different category — allowed.
    assert client.post("/api/income-expense/categories", headers=h,
                       json={"type": "income", "name": "Reisekosten"}).status_code == 201


def test_archive_restore_and_no_duplicates(auth_client, get_csrf_token):
    client, _ = auth_client
    h = {"X-CSRF-Token": get_csrf_token(client)}
    cat = client.post("/api/income-expense/categories", headers=h,
                      json={"type": "expense", "name": "Wohnung"}).get_json()["item"]

    # Archive (soft delete): new transactions in it are rejected...
    assert client.patch(f"/api/income-expense/categories/{cat['id']}", headers=h,
                        json={"archived": True}).status_code == 200
    assert client.post("/api/income-expense/transactions", headers=h,
                       json=_txn(category="wohnung")).status_code == 422
    # ...but re-adding the same name RESTORES the row instead of duplicating.
    resp = client.post("/api/income-expense/categories", headers=h,
                       json={"type": "expense", "name": "WOHNUNG"})
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["restored"] is True and body["item"]["id"] == cat["id"]
    assert body["item"]["archived"] is False
    assert client.post("/api/income-expense/transactions", headers=h,
                       json=_txn(category="wohnung")).status_code == 201


def test_archived_category_history_is_preserved(auth_client, get_csrf_token):
    client, _ = auth_client
    h = {"X-CSRF-Token": get_csrf_token(client)}
    cat = client.post("/api/income-expense/categories", headers=h,
                      json={"type": "expense", "name": "Altlasten"}).get_json()["item"]
    client.put("/api/income-expense/months/2026/3", headers=h,
               json=_cells(_cell(category="altlasten", amount=77), _cell(amount=400)))
    client.patch(f"/api/income-expense/categories/{cat['id']}", headers=h,
                 json={"archived": True})

    # Archived cells are rejected in a new PUT...
    assert client.put("/api/income-expense/months/2026/3", headers=h,
                      json=_cells(_cell(category="altlasten", amount=1))).status_code == 422
    # ...and a wholesale re-save of the month PRESERVES the archived cell.
    client.put("/api/income-expense/months/2026/3", headers=h, json=_cells(_cell(amount=500)))
    state = client.get("/api/income-expense/months/2026/3").get_json()
    assert {(c["category"], c["amount"]) for c in state["cells"]} == {
        ("altlasten", 77.0),
        ("food", 500.0),
    }
    # History keeps aggregating in the summary.
    summary = client.get("/api/income-expense/summary?year=2026").get_json()
    assert summary["by_category"]["expense"]["altlasten"] == 77.0


def test_category_slug_collision_gets_suffix(auth_client, get_csrf_token):
    client, _ = auth_client
    h = {"X-CSRF-Token": get_csrf_token(client)}
    a = client.post("/api/income-expense/categories", headers=h,
                    json={"type": "expense", "name": "Café"}).get_json()["item"]
    b = client.post("/api/income-expense/categories", headers=h,
                    json={"type": "expense", "name": "Caf-é"}).get_json()["item"]
    assert a["key"] == "caf" and b["key"] == "caf-2"


def test_category_idor_isolation(app, db, get_csrf_token):
    client_a, token_a = _new_user(app, get_csrf_token, "cat-owner@example.com")
    client_b, token_b = _new_user(app, get_csrf_token, "cat-attacker@example.com")
    cat = client_a.post("/api/income-expense/categories",
                        headers={"X-CSRF-Token": token_a},
                        json={"type": "expense", "name": "Privat"}).get_json()["item"]
    # B can't see or archive A's category, and can't post into it.
    assert all(i["key"] != "privat"
               for i in client_b.get("/api/income-expense/categories").get_json()["items"])
    assert client_b.patch(f"/api/income-expense/categories/{cat['id']}",
                          headers={"X-CSRF-Token": token_b},
                          json={"archived": True}).status_code == 404
    assert client_b.post("/api/income-expense/transactions",
                         headers={"X-CSRF-Token": token_b},
                         json=_txn(category="privat")).status_code == 422
