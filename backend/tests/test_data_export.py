"""
Data-export tests (#180) — the "download my data" contract.

Reuses the deletion suite's full-table seeding so the export is proven against a
row in EVERY user-scoped table. DB-backed (skipped without TEST_DATABASE_URL).
"""

from services import data_export
from services.account_deletion import USER_SCOPED_TABLES
from tests.test_account_deletion import _seed_user_with_full_data


def test_export_covers_every_registry_table(app, db):
    uid = _seed_user_with_full_data("exporter")
    _seed_user_with_full_data("other")  # bystander — must not leak in

    with app.app_context():
        payload = data_export.export_account(uid)

    assert payload["format_version"] == 1
    assert payload["account"]["id"] == uid
    assert payload["account"]["email"] == "cascade-exporter@example.com"

    # Every registry table appears, each with exactly the seeded row — and only
    # the exporter's row (user_id scoping = the IDOR boundary).
    assert set(payload["data"]) == set(USER_SCOPED_TABLES)
    for table, rows in payload["data"].items():
        assert len(rows) == 1, f"{table}: expected 1 row, got {len(rows)}"
        assert rows[0]["user_id"] == uid

    # Values are plain JSON types (Decimal/date normalised away).
    asset = payload["data"]["nw_assets"][0]
    assert isinstance(asset["current_value"], float)
    assert isinstance(asset["created_at"], str)


def test_export_strips_secret_columns(app, db):
    uid = _seed_user_with_full_data("secrets")

    with app.app_context():
        payload = data_export.export_account(uid)

    assert "password_hash" not in payload["account"]
    token_row = payload["data"]["password_reset_tokens"][0]
    assert "token_hash" not in token_row
    # ...but the record itself IS exported (it's data about the user).
    assert "expires_at" in token_row


def test_export_unknown_user_returns_none(app, db):
    with app.app_context():
        assert data_export.export_account(999_999_999) is None


def test_export_route_requires_login_and_downloads(app, auth_client, db):
    # Anonymous → 401 (login_required). Fresh client — auth_client wraps the
    # shared `client` fixture, which is already logged in.
    anon_resp = app.test_client().get("/api/auth/account/export")
    assert anon_resp.status_code == 401

    authed, user = auth_client
    resp = authed.get("/api/auth/account/export")
    assert resp.status_code == 200
    assert "attachment" in resp.headers["Content-Disposition"]
    assert resp.headers["Content-Disposition"].endswith('.json"')

    body = resp.get_json()
    assert body["account"]["id"] == user["id"]
    assert set(body["data"]) == set(USER_SCOPED_TABLES)
