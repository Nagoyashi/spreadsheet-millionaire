"""
Account-deletion service tests (#179) — the cascade contract.

Seeds a row in EVERY table in USER_SCOPED_TABLES for two users, deletes one, and
asserts: full erasure for the deleted user, zero collateral damage for the other,
an accurate per-table erasure report, and a clean schema-drift guard. Also holds
the route-level E2E (#186): a real registered user, seeded everywhere, deleted
through DELETE /api/auth/account — route guards, service, cascade, and session
teardown in one pass. DB-backed (skipped without TEST_DATABASE_URL).
"""

import os
from datetime import date

import psycopg
import pytest

from services import account_deletion

_TEST_DB_URL = os.environ.get("TEST_DATABASE_URL", "").strip()


def _seed_user_with_full_data(suffix: str) -> int:
    """Insert a user + exactly one row in every user-scoped table. Returns the
    user id. Direct SQL on the test connection (not the app's), mirroring how
    conftest truncates."""
    with psycopg.connect(_TEST_DB_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO users (email, password_hash) VALUES (%s, %s) RETURNING id",
                (f"cascade-{suffix}@example.com", "x" * 60),
            )
            uid = cur.fetchone()[0]
    seed_rows_for(uid, suffix)
    return uid


def seed_rows_for(uid: int, suffix: str) -> None:
    """Insert exactly one row in every user-scoped table for an EXISTING user —
    shared by the service tests here and the route-level E2E (#186)."""
    with psycopg.connect(_TEST_DB_URL) as conn:
        with conn.cursor() as cur:
            today = date.today()
            cur.execute(
                "INSERT INTO saved_calculators (user_id, name, calc_type, data) "
                "VALUES (%s, 'My FIRE', 'fire', '{}'::jsonb)",
                (uid,),
            )
            cur.execute(
                "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) "
                "VALUES (%s, %s, now() + interval '1 hour')",
                (uid, f"hash-{suffix}"),
            )
            cur.execute(
                "INSERT INTO nw_assets (user_id, asset_type, name, current_value) "
                "VALUES (%s, 'cash', 'Checking', 100)",
                (uid,),
            )
            cur.execute(
                "INSERT INTO nw_liabilities (user_id, liability_type, name, current_balance) "
                "VALUES (%s, 'loan', 'Car loan', 50)",
                (uid,),
            )
            cur.execute(
                "INSERT INTO nw_investment_holdings "
                "(user_id, ticker, quantity, cost_basis, asset_class) "
                "VALUES (%s, 'VTI', 1, 10, 'etf')",
                (uid,),
            )
            cur.execute(
                "INSERT INTO nw_real_estate (user_id, property_name, property_type, current_value) "
                "VALUES (%s, 'Home', 'primary', 1000)",
                (uid,),
            )
            cur.execute(
                "INSERT INTO nw_snapshots "
                "(user_id, snapshot_date, total_assets, total_liabilities, net_worth) "
                "VALUES (%s, %s, 1100, 50, 1050)",
                (uid, today),
            )
            cur.execute(
                "INSERT INTO ie_transactions (user_id, type, category, amount, occurred_on) "
                "VALUES (%s, 'expense', 'food', 5, %s)",
                (uid, today),
            )
            cur.execute(
                "INSERT INTO ie_categories (user_id, type, key, name) "
                "VALUES (%s, 'expense', 'food', 'Food')",
                (uid,),
            )
        conn.commit()


def _count_rows(table: str, uid: int) -> int:
    with psycopg.connect(_TEST_DB_URL) as conn:
        with conn.cursor() as cur:
            # Fixed identifiers from the registry — not user input.
            cur.execute(f"SELECT COUNT(*) FROM {table} WHERE user_id = %s", (uid,))
            return cur.fetchone()[0]


def test_registry_matches_conftest_wipe_list():
    """The registry and conftest's truncation list must name the same tables
    (conftest adds `users` itself) — two lists drifting apart would mean the
    tests wipe tables the deletion contract doesn't know about, or vice versa."""
    from tests.conftest import _USER_TABLES

    assert set(account_deletion.USER_SCOPED_TABLES) == set(_USER_TABLES) - {"users"}


def test_delete_account_wipes_every_table_and_spares_others(app, db):
    victim = _seed_user_with_full_data("victim")
    bystander = _seed_user_with_full_data("bystander")

    with app.app_context():
        report = account_deletion.delete_account(victim)

    # Erasure report: exactly one row per table, every table present.
    assert report["user_id"] == victim
    assert set(report["deleted"]) == set(account_deletion.USER_SCOPED_TABLES)
    assert all(n == 1 for n in report["deleted"].values()), report["deleted"]

    # Full erasure for the victim; zero collateral for the bystander (IDOR-style
    # isolation — the queries are user_id-scoped by construction).
    for table in account_deletion.USER_SCOPED_TABLES:
        assert _count_rows(table, victim) == 0, f"{table} kept victim rows"
        assert _count_rows(table, bystander) == 1, f"{table} lost bystander rows"

    with psycopg.connect(_TEST_DB_URL) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM users WHERE id = %s", (victim,))
            assert cur.fetchone()[0] == 0
            cur.execute("SELECT COUNT(*) FROM users WHERE id = %s", (bystander,))
            assert cur.fetchone()[0] == 1


def test_delete_unknown_user_returns_none(app, db):
    with app.app_context():
        assert account_deletion.delete_account(999_999_999) is None


def test_cascade_coverage_guard_is_clean(app, db):
    """The live schema and USER_SCOPED_TABLES agree — every cascade table is in
    the registry, every registry table cascades, and any other users(id)
    referencer is a known retained table. A failure here means a user-scoped
    table was added without updating the deletion contract."""
    with app.app_context():
        assert account_deletion.verify_cascade_coverage() == []


def test_route_delete_account_uses_the_service(auth_client, get_csrf_token, monkeypatch):
    """The DELETE /api/auth/account route goes through the service (the single
    deletion path) — spy on it and assert it's called with the session's user."""
    client, user = auth_client
    calls = []

    def spy(user_id):
        calls.append(user_id)
        return {"user_id": user_id, "deleted": {}}

    from routes import auth as auth_routes

    monkeypatch.setattr(auth_routes.account_deletion, "delete_account", spy)

    token = get_csrf_token(client)
    resp = client.delete(
        "/api/auth/account",
        headers={"X-CSRF-Token": token},
        json={"password": "Testpass123"},
    )
    assert resp.status_code == 200
    assert calls == [user["id"]]


def test_route_e2e_full_cascade(app, auth_client, get_csrf_token):
    """#186 — the end-to-end cascade: a real registered user with a row in
    EVERY user-scoped table deletes their account through the actual route
    (password + CSRF), and nothing of theirs survives anywhere. The service
    tests above prove the contract; this proves the whole path a real deletion
    takes — route guards, service, cascade, session teardown."""
    client, user = auth_client
    seed_rows_for(user["id"], "e2e")

    token = get_csrf_token(client)
    resp = client.delete(
        "/api/auth/account",
        headers={"X-CSRF-Token": token},
        json={"password": "Testpass123"},
    )
    assert resp.status_code == 200

    # Nothing survives in any registry table, and the user row is gone.
    for table in account_deletion.USER_SCOPED_TABLES:
        assert _count_rows(table, user["id"]) == 0, f"{table} kept rows"
    with psycopg.connect(_TEST_DB_URL) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM users WHERE id = %s", (user["id"],))
            assert cur.fetchone()[0] == 0

    # The session is torn down: the client is anonymous again.
    status = client.get("/api/auth/status").get_json()
    assert status["logged_in"] is False
