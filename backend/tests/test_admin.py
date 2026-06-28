"""
Tests for the /api/admin/* surface and the public published-types endpoint.

Covers the admin gate (hard rule #8 — the route layer of UI/route/DB), the
publish toggle, and the public read the toggle drives. DB-backed: skipped
without TEST_DATABASE_URL.
"""

import os

import psycopg
import pytest

from calc_types import VALID_CALC_TYPES, DEFAULT_PUBLISHED_TYPES

_TEST_DB_URL = os.environ.get("TEST_DATABASE_URL", "").strip()


def _promote(email: str) -> None:
    """Flip a registered user to admin directly in the DB."""
    with psycopg.connect(_TEST_DB_URL) as conn:
        conn.execute("UPDATE users SET is_admin = true WHERE email = %s", (email,))
        conn.commit()


def _reset_publish_to_defaults() -> None:
    """Re-seed calculator_publish to the default published set as a clean
    baseline. conftest's `TRUNCATE users ... CASCADE` also empties this table
    (via the updated_by FK), so we upsert every row rather than UPDATE — the
    table is empty at the start of each DB test."""
    with psycopg.connect(_TEST_DB_URL) as conn:
        for calc_type in VALID_CALC_TYPES:
            conn.execute(
                "INSERT INTO calculator_publish (calc_type, published) VALUES (%s, %s) "
                "ON CONFLICT (calc_type) DO UPDATE SET published = EXCLUDED.published",
                (calc_type, calc_type in DEFAULT_PUBLISHED_TYPES),
            )
        conn.commit()


@pytest.fixture
def admin_client(auth_client):
    """auth_client's user, promoted to admin. Returns (client, user_dict)."""
    client, user = auth_client
    _promote(user["email"])
    _reset_publish_to_defaults()
    return client, user


# ---------------------------------------------------------------------------- #
# The admin gate
# ---------------------------------------------------------------------------- #
def test_admin_calculators_requires_auth(client, db):
    """No session → 401."""
    assert client.get("/api/admin/calculators").status_code == 401


def test_admin_calculators_hidden_from_normal_user(auth_client):
    """A logged-in non-admin gets 404 — the portal stays invisible, not 403."""
    client, _ = auth_client
    resp = client.get("/api/admin/calculators")
    assert resp.status_code == 404


def test_admin_status_exposes_is_admin_flag(admin_client):
    """The session-status payload carries is_admin so the SPA can gate /admin."""
    client, _ = admin_client
    body = client.get("/api/auth/status").get_json()
    assert body["logged_in"] is True
    assert body["user"]["is_admin"] is True


# ---------------------------------------------------------------------------- #
# Overview — list + toggle
# ---------------------------------------------------------------------------- #
def test_admin_lists_all_calculators(admin_client):
    client, _ = admin_client
    body = client.get("/api/admin/calculators").get_json()
    rows = body["calculators"]
    # One row per known calc type, each with the expected shape.
    types = {r["calc_type"] for r in rows}
    assert "fire" in types and "sankey" in types
    fire = next(r for r in rows if r["calc_type"] == "fire")
    assert fire["published"] is True          # seeded default
    assert "visits_30d" in fire               # GA4 placeholder (null for now)


def test_toggle_publishes_and_drives_public_endpoint(admin_client, get_csrf_token):
    client, _ = admin_client
    token = get_csrf_token(client)

    # sankey starts unpublished; publishing it must surface on the PUBLIC list.
    assert "sankey" not in client.get("/api/calculators/published").get_json()["published"]

    resp = client.patch(
        "/api/admin/calculators/sankey",
        headers={"X-CSRF-Token": token},
        json={"published": True},
    )
    assert resp.status_code == 200
    assert resp.get_json()["calculator"]["published"] is True

    published = client.get("/api/calculators/published").get_json()["published"]
    assert "sankey" in published


def test_toggle_unpublish_removes_from_public(admin_client, get_csrf_token):
    client, _ = admin_client
    token = get_csrf_token(client)

    resp = client.patch(
        "/api/admin/calculators/fire",
        headers={"X-CSRF-Token": token},
        json={"published": False},
    )
    assert resp.status_code == 200
    assert "fire" not in client.get("/api/calculators/published").get_json()["published"]


def test_toggle_rejects_unknown_calc_type(admin_client, get_csrf_token):
    client, _ = admin_client
    token = get_csrf_token(client)
    resp = client.patch(
        "/api/admin/calculators/not_a_calc",
        headers={"X-CSRF-Token": token},
        json={"published": True},
    )
    assert resp.status_code == 404


def test_toggle_rejects_non_boolean(admin_client, get_csrf_token):
    client, _ = admin_client
    token = get_csrf_token(client)
    resp = client.patch(
        "/api/admin/calculators/fire",
        headers={"X-CSRF-Token": token},
        json={"published": "yes"},
    )
    assert resp.status_code == 400


def test_toggle_forbidden_for_non_admin(auth_client, get_csrf_token):
    """A non-admin can't toggle — 404, and the flag is unchanged."""
    client, _ = auth_client
    token = get_csrf_token(client)
    resp = client.patch(
        "/api/admin/calculators/fire",
        headers={"X-CSRF-Token": token},
        json={"published": False},
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------- #
# Public endpoint is open to anonymous visitors
# ---------------------------------------------------------------------------- #
def test_published_endpoint_is_public(client, db):
    """No auth required — anonymous visitors read the published surface."""
    _reset_publish_to_defaults()
    body = client.get("/api/calculators/published").get_json()
    assert set(body["published"]) == set(DEFAULT_PUBLISHED_TYPES)
