"""
Auth-endpoint rate-limit audit (#188) — pin the limits so they can't silently
disappear in a refactor.

The issue names login / signup / reset / verify-resend. Audit outcome:
  - login            20/hour; 5/minute   → pinned here (the 5/minute tier)
  - register         10/hour             → pinned here
  - forgot-password  3/hour              → pinned here
  - reset-password   10/hour; 5/minute   → pinned here (the 5/minute tier)
  - verify-resend    DOES NOT EXIST — there is no email-verification flow
    (see DECISIONS § "Settings as a single stacked page"); nothing to limit.

The main suite disables Flask-Limiter (conftest sets RATELIMIT_ENABLED=False),
so these tests build their OWN app with limits live. Storage is memory://
(REDIS_URL is blank in the harness), and the module-level limiter only counts
requests on limit-enabled apps, so nothing here bleeds into other tests.
Requests that fail (401 wrong password, 400 bad token, 409 duplicate) still
count toward the limit — that's the point: attackers don't send valid requests.

DB-backed: the endpoints touch the users table even on the failure paths.
"""

import pytest

from app import create_app


@pytest.fixture
def limited_client(db):
    """A client on an app with rate limiting LIVE (unlike the shared fixtures)."""
    application = create_app()
    application.config.update(TESTING=True)  # RATELIMIT_ENABLED stays on
    return application.test_client()


def _csrf(client):
    return client.get("/api/auth/csrf-token").get_json()["csrf_token"]


def test_login_is_limited_to_5_per_minute(limited_client):
    token = _csrf(limited_client)
    for _ in range(5):
        resp = limited_client.post(
            "/api/auth/login",
            headers={"X-CSRF-Token": token},
            json={"email": "nobody@example.com", "password": "WrongPass999"},
        )
        assert resp.status_code == 401  # counted even though it failed
    resp = limited_client.post(
        "/api/auth/login",
        headers={"X-CSRF-Token": token},
        json={"email": "nobody@example.com", "password": "WrongPass999"},
    )
    assert resp.status_code == 429  # the 6th within a minute is throttled


def test_register_is_limited_to_10_per_hour(limited_client):
    token = _csrf(limited_client)
    for i in range(10):
        resp = limited_client.post(
            "/api/auth/register",
            headers={"X-CSRF-Token": token},
            json={"email": f"burst-{i}@example.com", "password": "Testpass123"},
        )
        # First succeeds; the rest fail on "already logged in" — still counted.
        assert resp.status_code in (201, 400)
    resp = limited_client.post(
        "/api/auth/register",
        headers={"X-CSRF-Token": token},
        json={"email": "burst-11@example.com", "password": "Testpass123"},
    )
    assert resp.status_code == 429


def test_forgot_password_is_limited_to_3_per_hour(limited_client):
    token = _csrf(limited_client)
    for _ in range(3):
        resp = limited_client.post(
            "/api/auth/forgot-password",
            headers={"X-CSRF-Token": token},
            json={"email": "nobody@example.com"},
        )
        assert resp.status_code == 200  # always-200 (no email enumeration)
    resp = limited_client.post(
        "/api/auth/forgot-password",
        headers={"X-CSRF-Token": token},
        json={"email": "nobody@example.com"},
    )
    assert resp.status_code == 429


def test_reset_password_is_limited_to_5_per_minute(limited_client):
    token = _csrf(limited_client)
    for _ in range(5):
        resp = limited_client.post(
            "/api/auth/reset-password",
            headers={"X-CSRF-Token": token},
            json={"token": "garbage", "new_password": "Testpass123"},
        )
        assert resp.status_code == 400  # invalid token — still counted
    resp = limited_client.post(
        "/api/auth/reset-password",
        headers={"X-CSRF-Token": token},
        json={"token": "garbage", "new_password": "Testpass123"},
    )
    assert resp.status_code == 429
