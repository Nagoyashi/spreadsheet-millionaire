"""
Entitlement-boundary tests (#185) — pin every documented access-control claim.

The entitlement surface today (DECISIONS § "Account tiers, suspension & the
admin audit log"): tiers exist as data with deliberately NO feature enforcement
until billing; suspension is the real gate and is enforced at LOGIN; the admin
portal additionally re-checks admin/suspended fresh from the DB on every
request. These tests pin each claim, including two that were documented but
never tested:

  - suspension is checked only AFTER the password verifies, so a suspension
    403 can't be used to probe which emails exist;
  - admin/suspended status is read fresh per request — revoking admin or
    suspending an admin takes effect on their very next request, live session
    or not.

Also pinned as documented-current-behavior (not a bug, the login-gate design):
a suspended NORMAL user's live session keeps working until it ends — only the
login door closes. If that trade-off is ever revisited, this test is the one
to flip.

DB-backed (skipped without TEST_DATABASE_URL; hard-fail in CI, #183).
"""

import os

import psycopg

_TEST_DB_URL = os.environ.get("TEST_DATABASE_URL", "").strip()


def _set(email: str, **cols) -> None:
    """Flip user columns directly in the DB (as the admin surface would)."""
    sets = ", ".join(f"{k} = %s" for k in cols)  # fixed keys from call sites
    with psycopg.connect(_TEST_DB_URL) as conn:
        conn.execute(
            f"UPDATE users SET {sets} WHERE email = %s",  # noqa: S608
            (*cols.values(), email),
        )
        conn.commit()


def _login(client, get_csrf_token, email, password="Testpass123"):
    token = get_csrf_token(client)
    return client.post(
        "/api/auth/login",
        headers={"X-CSRF-Token": token},
        json={"email": email, "password": password},
    )


def test_suspension_blocks_login_after_password_check(app, auth_client, get_csrf_token):
    """Suspended → 403 at login; but a WRONG password on a suspended account
    must return the generic 401, not the 403 — otherwise the suspension status
    (and with it the account's existence) leaks to anyone probing emails."""
    client, user = auth_client
    token = get_csrf_token(client)
    client.post("/api/auth/logout", headers={"X-CSRF-Token": token})
    _set(user["email"], suspended=True)

    fresh = app.test_client()
    wrong = _login(fresh, get_csrf_token, user["email"], "WrongPass999")
    assert wrong.status_code == 401  # generic — suspension not revealed

    right = _login(app.test_client(), get_csrf_token, user["email"])
    assert right.status_code == 403
    assert "suspended" in right.get_json()["error"].lower()


def test_suspended_live_session_keeps_app_access(auth_client, get_csrf_token):
    """Documented current behavior (login-gate design): suspending a normal
    user does NOT kill their live session — the app surface still serves them
    until the session ends. Pinned so any future change is deliberate."""
    client, user = auth_client
    _set(user["email"], suspended=True)

    status = client.get("/api/auth/status")
    assert status.status_code == 200 and status.get_json()["logged_in"] is True

    token = get_csrf_token(client)
    save = client.post(
        "/api/calculators",
        headers={"X-CSRF-Token": token},
        json={"name": "still works", "calc_type": "fire", "data": {"version": 1}},
    )
    assert save.status_code == 201


def test_suspended_admin_loses_portal_immediately(auth_client, get_csrf_token):
    """The admin portal re-checks suspended per request: a suspended admin's
    LIVE session gets 404 on the very next admin call (unlike the app surface
    above — the portal is the sharper boundary)."""
    client, user = auth_client
    _set(user["email"], is_admin=True)
    assert client.get("/api/admin/calculators").status_code == 200

    _set(user["email"], suspended=True)
    assert client.get("/api/admin/calculators").status_code == 404


def test_revoked_admin_loses_portal_immediately(auth_client):
    """is_admin is read fresh from the DB every request (no session caching):
    revoking admin takes effect on the next request, live session or not."""
    client, user = auth_client
    _set(user["email"], is_admin=True)
    assert client.get("/api/admin/calculators").status_code == 200

    _set(user["email"], is_admin=False)
    assert client.get("/api/admin/calculators").status_code == 404


def test_superadmin_gate_reads_fresh_too(auth_client, get_csrf_token):
    """superadmin_required is the same fresh-read pattern: an admin promoted to
    superadmin gains the grant-admin endpoint on the next request; demoted, it
    404s again — without any session change."""
    client, user = auth_client
    _set(user["email"], is_admin=True)
    token = get_csrf_token(client)

    other_id = 999_999_999  # target doesn't matter — the gate fires first
    resp = client.patch(
        f"/api/admin/users/{other_id}/admin",
        headers={"X-CSRF-Token": token},
        json={"is_admin": True},
    )
    # Plain admin: the GATE hides the endpoint ("Resource not found").
    assert resp.status_code == 404
    assert resp.get_json()["error"] == "Resource not found."

    _set(user["email"], is_superadmin=True)
    resp = client.patch(
        f"/api/admin/users/{other_id}/admin",
        headers={"X-CSRF-Token": token},
        json={"is_admin": True},
    )
    # Through the gate now — this 404 is the route's unknown-USER lookup.
    assert resp.status_code == 404
    assert resp.get_json()["error"] == "User not found."


def test_tier_carries_no_enforcement_yet(auth_client, get_csrf_token):
    """Deliberate (DECISIONS): tiers are manual comp with no feature gating
    until billing — a 'free' account and an admin-comped 'elite' account get
    the identical surface. Pinned so the Freemium gate, when it lands, has to
    change this test consciously."""
    client, user = auth_client
    token = get_csrf_token(client)

    def save(name):
        return client.post(
            "/api/calculators",
            headers={"X-CSRF-Token": token},
            json={"name": name, "calc_type": "fire", "data": {"version": 1}},
        ).status_code

    assert save("as free") == 201
    _set(user["email"], tier="elite")
    assert save("as elite") == 201