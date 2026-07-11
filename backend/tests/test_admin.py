"""
Tests for the /api/admin/* surface and the public published-types endpoint.

Covers the admin gate (hard rule #8 — the route layer of UI/route/DB), the
publish toggle, and the public read the toggle drives. DB-backed: skipped
without TEST_DATABASE_URL.
"""

import os

import psycopg
import pytest

from calc_types import DEFAULT_PUBLISHED_TYPES
from publishable import PUBLISHABLE_TYPES

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
        for calc_type in PUBLISHABLE_TYPES:
            conn.execute(
                "INSERT INTO calculator_publish (calc_type, published) VALUES (%s, %s) "
                "ON CONFLICT (calc_type) DO UPDATE SET published = EXCLUDED.published",
                (calc_type, calc_type in DEFAULT_PUBLISHED_TYPES),
            )
        conn.commit()


def _promote_super(email: str) -> None:
    with psycopg.connect(_TEST_DB_URL) as conn:
        conn.execute(
            "UPDATE users SET is_superadmin = true, is_admin = true WHERE email = %s",
            (email,),
        )
        conn.commit()


@pytest.fixture
def admin_client(auth_client):
    """auth_client's user, promoted to admin. Returns (client, user_dict)."""
    client, user = auth_client
    _promote(user["email"])
    _reset_publish_to_defaults()
    return client, user


@pytest.fixture
def superadmin_client(auth_client):
    """auth_client's user, promoted to superadmin. Returns (client, user_dict)."""
    client, user = auth_client
    _promote_super(user["email"])
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


# ---------------------------------------------------------------------------- #
# Users — list / search / tier / suspend (audit-logged)
# ---------------------------------------------------------------------------- #
def _register(app, email, password="Testpass123"):
    """Register a fresh user via its own client; returns that client."""
    c = app.test_client()
    token = c.get("/api/auth/csrf-token").get_json()["csrf_token"]
    resp = c.post(
        "/api/auth/register",
        headers={"X-CSRF-Token": token},
        json={"email": email, "password": password},
    )
    assert resp.status_code == 201, resp.get_data(as_text=True)
    return c


def _audit_count(action, target_id):
    with psycopg.connect(_TEST_DB_URL) as conn:
        return conn.execute(
            "SELECT COUNT(*) FROM admin_audit_log WHERE action = %s AND target_user_id = %s",
            (action, target_id),
        ).fetchone()[0]


def test_users_list_requires_admin(auth_client):
    client, _ = auth_client
    assert client.get("/api/admin/users").status_code == 404


def test_users_list_and_tier_counts(admin_client, app):
    client, admin = admin_client
    _register(app, "alice@example.com")
    body = client.get("/api/admin/users").get_json()
    emails = {u["email"] for u in body["users"]}
    assert {"test@example.com", "alice@example.com"} <= emails
    assert body["tier_counts"].get("free", 0) >= 2  # everyone defaults to free


def test_users_search_filters(admin_client, app):
    client, _ = admin_client
    _register(app, "findme@example.com")
    body = client.get("/api/admin/users?search=findme").get_json()
    assert [u["email"] for u in body["users"]] == ["findme@example.com"]


def test_set_tier_persists_and_audits(admin_client, app, get_csrf_token):
    client, _ = admin_client
    target = _register(app, "promote@example.com")
    target_id = target.get("/api/auth/status").get_json()["user"]["id"]
    token = get_csrf_token(client)

    resp = client.patch(
        f"/api/admin/users/{target_id}",
        headers={"X-CSRF-Token": token},
        json={"tier": "pro"},
    )
    assert resp.status_code == 200
    assert resp.get_json()["user"]["tier"] == "pro"
    # persists on reload
    again = client.get("/api/admin/users?search=promote").get_json()["users"][0]
    assert again["tier"] == "pro"
    assert _audit_count("set_tier", target_id) == 1


def test_set_tier_rejects_unknown_tier(admin_client, app, get_csrf_token):
    client, _ = admin_client
    target = _register(app, "badtier@example.com")
    target_id = target.get("/api/auth/status").get_json()["user"]["id"]
    token = get_csrf_token(client)
    resp = client.patch(
        f"/api/admin/users/{target_id}",
        headers={"X-CSRF-Token": token},
        json={"tier": "platinum"},
    )
    assert resp.status_code == 400


def test_suspend_blocks_login_and_reinstate_restores(admin_client, app, get_csrf_token):
    client, _ = admin_client
    target = _register(app, "suspendme@example.com")
    target_id = target.get("/api/auth/status").get_json()["user"]["id"]
    token = get_csrf_token(client)

    # Suspend
    resp = client.patch(
        f"/api/admin/users/{target_id}",
        headers={"X-CSRF-Token": token},
        json={"suspended": True},
    )
    assert resp.status_code == 200 and resp.get_json()["user"]["suspended"] is True
    assert _audit_count("suspend", target_id) == 1

    # A suspended account can't log in (fresh client).
    fresh = app.test_client()
    t2 = fresh.get("/api/auth/csrf-token").get_json()["csrf_token"]
    login = fresh.post(
        "/api/auth/login",
        headers={"X-CSRF-Token": t2},
        json={"email": "suspendme@example.com", "password": "Testpass123"},
    )
    assert login.status_code == 403

    # Reinstate → login works again.
    token = get_csrf_token(client)
    client.patch(
        f"/api/admin/users/{target_id}",
        headers={"X-CSRF-Token": token},
        json={"suspended": False},
    )
    assert _audit_count("reinstate", target_id) == 1
    fresh2 = app.test_client()
    t3 = fresh2.get("/api/auth/csrf-token").get_json()["csrf_token"]
    login2 = fresh2.post(
        "/api/auth/login",
        headers={"X-CSRF-Token": t3},
        json={"email": "suspendme@example.com", "password": "Testpass123"},
    )
    assert login2.status_code == 200


def test_admin_cannot_suspend_self(admin_client, get_csrf_token):
    client, admin = admin_client
    token = get_csrf_token(client)
    resp = client.patch(
        f"/api/admin/users/{admin['id']}",
        headers={"X-CSRF-Token": token},
        json={"suspended": True},
    )
    assert resp.status_code == 400


def test_update_unknown_user_404(admin_client, get_csrf_token):
    client, _ = admin_client
    token = get_csrf_token(client)
    resp = client.patch(
        "/api/admin/users/999999",
        headers={"X-CSRF-Token": token},
        json={"tier": "pro"},
    )
    assert resp.status_code == 404


def test_update_user_requires_a_field(admin_client, app, get_csrf_token):
    client, _ = admin_client
    target = _register(app, "nofields@example.com")
    target_id = target.get("/api/auth/status").get_json()["user"]["id"]
    token = get_csrf_token(client)
    resp = client.patch(
        f"/api/admin/users/{target_id}",
        headers={"X-CSRF-Token": token},
        json={},
    )
    assert resp.status_code == 400


def test_user_update_forbidden_for_non_admin(auth_client, app, get_csrf_token):
    client, _ = auth_client
    token = get_csrf_token(client)
    resp = client.patch(
        "/api/admin/users/1",
        headers={"X-CSRF-Token": token},
        json={"tier": "pro"},
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------- #
# Analytics — DB-sourced now, GA4 empty-state until configured
# ---------------------------------------------------------------------------- #
def test_analytics_requires_admin(auth_client):
    client, _ = auth_client
    assert client.get("/api/admin/analytics").status_code == 404


def test_analytics_empty_state_uses_db_signups(admin_client, app):
    """With GA4 + PostHog unconfigured (tests never set them), the endpoint
    reports both false but still returns real DB-sourced signups + tier funnel."""
    client, _ = admin_client
    _register(app, "newbie@example.com")
    body = client.get("/api/admin/analytics?range=30d").get_json()

    assert body["configured"] is False
    assert body["posthog_configured"] is False          # PostHog also unconfigured
    assert body["activation_funnel"] is None            # PostHog-sourced → null
    assert body["kpis"]["total_visitors"] is None       # GA-sourced → null
    assert body["kpis"]["new_signups"] >= 2             # admin + newbie, from DB
    assert body["visitors_over_time"] is None
    assert body["funnel"]["free"] >= 2                  # DB tier counts
    assert body["funnel"]["pro"] == 0 and body["funnel"]["elite"] == 0
    assert body["kpis"]["revenue"] is None              # MRR placeholder until billing


def test_analytics_surfaces_posthog_funnel_when_configured(admin_client, monkeypatch):
    """When PostHog is configured, the activation funnel + per-calculator usage
    come from it (independently of GA4, which stays unconfigured here)."""
    from services import posthog_analytics

    monkeypatch.setattr(posthog_analytics, "is_configured", lambda: True)
    monkeypatch.setattr(
        posthog_analytics,
        "fetch",
        lambda range_days: {
            "activation_funnel": {e: 0 for e in posthog_analytics.FUNNEL_EVENTS}
            | {"calculator_used": 42, "account_created": 9},
            "top_calculators": [{"calc_type": "fire", "runs": 42}],
        },
    )

    client, _ = admin_client
    body = client.get("/api/admin/analytics?range=30d").get_json()

    assert body["posthog_configured"] is True
    assert body["posthog_error"] is None
    assert body["activation_funnel"]["calculator_used"] == 42
    assert body["activation_funnel"]["account_created"] == 9
    assert body["top_calculators"] == [{"calc_type": "fire", "runs": 42}]
    assert body["configured"] is False                  # GA4 still off, independent


def test_analytics_labels_posthog_error_without_500(admin_client, monkeypatch):
    """A configured-but-broken PostHog surfaces in posthog_error, not a 500."""
    from services import posthog_analytics

    def _boom(_range):
        raise posthog_analytics.PostHogError("bad key")

    monkeypatch.setattr(posthog_analytics, "is_configured", lambda: True)
    monkeypatch.setattr(posthog_analytics, "fetch", _boom)

    client, _ = admin_client
    resp = client.get("/api/admin/analytics?range=30d")
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["posthog_error"] == "bad key"
    assert body["activation_funnel"] is None


# ---------------------------------------------------------------------------- #
# Trackers are publishable too (revealed from the portal, not a build flag)
# ---------------------------------------------------------------------------- #
def test_tracker_publish_toggle_drives_public(admin_client, get_csrf_token):
    client, _ = admin_client
    token = get_csrf_token(client)
    # Trackers ship dark — unpublished by default.
    assert "net-worth" not in client.get("/api/calculators/published").get_json()["published"]
    resp = client.patch(
        "/api/admin/calculators/net-worth",
        headers={"X-CSRF-Token": token},
        json={"published": True},
    )
    assert resp.status_code == 200 and resp.get_json()["calculator"]["published"] is True
    assert "net-worth" in client.get("/api/calculators/published").get_json()["published"]


def test_tracker_appears_in_admin_catalog(admin_client):
    client, _ = admin_client
    types = {r["calc_type"] for r in client.get("/api/admin/calculators").get_json()["calculators"]}
    assert {"net-worth", "income-expenses"} <= types


# ---------------------------------------------------------------------------- #
# Admin role grants — superadmin only
# ---------------------------------------------------------------------------- #
def test_grant_admin_is_superadmin_only(admin_client, app, get_csrf_token):
    """A normal admin (not superadmin) can't grant admin — 404 (invisible)."""
    client, _ = admin_client
    target = _register(app, "wannabe@example.com")
    tid = target.get("/api/auth/status").get_json()["user"]["id"]
    token = get_csrf_token(client)
    resp = client.patch(
        f"/api/admin/users/{tid}/admin",
        headers={"X-CSRF-Token": token},
        json={"is_admin": True},
    )
    assert resp.status_code == 404


def test_superadmin_grants_and_revokes_admin(superadmin_client, app, get_csrf_token):
    client, _ = superadmin_client
    target = _register(app, "newadmin@example.com")
    tid = target.get("/api/auth/status").get_json()["user"]["id"]

    token = get_csrf_token(client)
    grant = client.patch(
        f"/api/admin/users/{tid}/admin",
        headers={"X-CSRF-Token": token},
        json={"is_admin": True},
    )
    assert grant.status_code == 200 and grant.get_json()["user"]["is_admin"] is True
    assert _audit_count("grant_admin", tid) == 1

    token = get_csrf_token(client)
    revoke = client.patch(
        f"/api/admin/users/{tid}/admin",
        headers={"X-CSRF-Token": token},
        json={"is_admin": False},
    )
    assert revoke.get_json()["user"]["is_admin"] is False
    assert _audit_count("revoke_admin", tid) == 1


def test_superadmin_cannot_change_own_admin(superadmin_client, get_csrf_token):
    client, admin = superadmin_client
    token = get_csrf_token(client)
    resp = client.patch(
        f"/api/admin/users/{admin['id']}/admin",
        headers={"X-CSRF-Token": token},
        json={"is_admin": False},
    )
    assert resp.status_code == 400


def test_status_exposes_is_superadmin(superadmin_client):
    client, _ = superadmin_client
    user = client.get("/api/auth/status").get_json()["user"]
    assert user["is_superadmin"] is True and user["is_admin"] is True


def test_superadmin_implies_admin_db_constraint(superadmin_client):
    """The DB CHECK rejects leaving a superadmin with is_admin=false — so even the
    manual set_admin lever can't diverge the column from the computed value."""
    _, admin = superadmin_client
    with psycopg.connect(_TEST_DB_URL) as conn:
        with pytest.raises(psycopg.errors.CheckViolation):
            conn.execute("UPDATE users SET is_admin = false WHERE id = %s", (admin["id"],))
        conn.rollback()


def test_suspended_admin_loses_portal_access(admin_client):
    """Suspending an admin cuts portal access on the live session, not just at
    next login — admin_required rejects a suspended account."""
    client, admin = admin_client
    with psycopg.connect(_TEST_DB_URL) as conn:
        conn.execute("UPDATE users SET suspended = true WHERE id = %s", (admin["id"],))
        conn.commit()
    assert client.get("/api/admin/calculators").status_code == 404


def test_normal_admin_cannot_modify_another_admin(admin_client, app, get_csrf_token):
    """A non-superadmin admin can't suspend/re-tier another admin (privilege
    protection) — only a superadmin can act on a privileged account."""
    client, _ = admin_client
    other = _register(app, "fellow-admin@example.com")
    other_id = other.get("/api/auth/status").get_json()["user"]["id"]
    _promote("fellow-admin@example.com")  # make the target an admin
    token = get_csrf_token(client)
    resp = client.patch(
        f"/api/admin/users/{other_id}",
        headers={"X-CSRF-Token": token},
        json={"suspended": True},
    )
    assert resp.status_code == 403


def test_superadmin_can_modify_an_admin(superadmin_client, app, get_csrf_token):
    """A superadmin CAN act on an admin account (the protection is non-superadmin-only)."""
    client, _ = superadmin_client
    other = _register(app, "managed-admin@example.com")
    other_id = other.get("/api/auth/status").get_json()["user"]["id"]
    _promote("managed-admin@example.com")
    token = get_csrf_token(client)
    resp = client.patch(
        f"/api/admin/users/{other_id}",
        headers={"X-CSRF-Token": token},
        json={"tier": "pro"},
    )
    assert resp.status_code == 200 and resp.get_json()["user"]["tier"] == "pro"
