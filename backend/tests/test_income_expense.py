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
