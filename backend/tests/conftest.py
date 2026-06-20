"""
Shared pytest fixtures for the backend test suite.

This module MUST set a hermetic test environment BEFORE importing the app, for
two reasons:

  1. config.py validates FLASK_SECRET_KEY and DATABASE_URL at *import time* and
     calls sys.exit(1) when they're missing — the app cannot be imported without
     them.
  2. We *force* (not setdefault) the infra-pointing vars so a developer's real
     .env or shell environment can NEVER cause a test run to touch the
     production database, Redis, or email provider.

DB-backed tests (auth, IDOR, saved-data) opt in via the `db` / `auth_client`
fixtures, which need a real throwaway Postgres in TEST_DATABASE_URL and are
skipped when it's absent. The DB-free majority — including the health smoke
test — run with no infrastructure at all.
"""

import os

# ── Hermetic test environment — set BEFORE importing the app (see module doc) ──
# A real (non-placeholder) 64-char key clears config.py's >= 32-char check.
os.environ["FLASK_SECRET_KEY"] = "0" * 64
# development mode disables Talisman's HTTPS redirect and makes REDIS_URL
# optional (filesystem sessions instead of a real Redis round-trip).
os.environ["FLASK_ENV"] = "development"
# Never reach real infrastructure from a test run.
os.environ["REDIS_URL"] = ""
os.environ["RESEND_API_KEY"] = ""
# DATABASE_URL must start with "postgres" to clear validation. Point at the
# throwaway test DB when provided; otherwise a dummy URL that is never connected
# (DB-free tests open no connection; DB tests skip without TEST_DATABASE_URL).
_TEST_DB_URL = os.environ.get("TEST_DATABASE_URL", "").strip()
os.environ["DATABASE_URL"] = (
    _TEST_DB_URL or "postgresql://unused:unused@localhost:5432/unused"
)

import pytest  # noqa: E402  — intentional: import after env is set up

from app import create_app  # noqa: E402
import db_init  # noqa: E402

# User-scoped tables wiped between DB tests so rows never leak across tests.
# (TRUNCATE ... CASCADE on users already reaches the nw_* tables via their FK,
# but listing them explicitly keeps RESTART IDENTITY deterministic and the
# intent obvious.)
_USER_TABLES = (
    "password_reset_tokens",
    "saved_calculators",
    "nw_assets",
    "nw_liabilities",
    "nw_investment_holdings",
    "nw_real_estate",
    "nw_snapshots",
    "users",
)


@pytest.fixture
def app():
    """A Flask app from the real create_app() factory, in test mode."""
    application = create_app()
    application.config.update(
        TESTING=True,
        RATELIMIT_ENABLED=False,  # neutralise Flask-Limiter across the suite
    )
    yield application


@pytest.fixture
def client(app):
    """Anonymous test client. Cookies (incl. the session) persist across calls."""
    return app.test_client()


@pytest.fixture
def get_csrf_token():
    """
    Helper to fetch a CSRF token bound to a client's session.

    The token is stored server-side in the session; the test client keeps the
    session cookie, so the returned token is valid for subsequent mutating
    requests made with the SAME client:

        token = get_csrf_token(client)
        client.post(url, headers={"X-CSRF-Token": token}, json={...})
    """
    def _fetch(test_client):
        resp = test_client.get("/api/auth/csrf-token")
        return resp.get_json()["csrf_token"]

    return _fetch


@pytest.fixture
def db(app):
    """
    Real-Postgres fixture with between-test isolation.

    Points the app at the throwaway database in TEST_DATABASE_URL, ensures the
    schema exists (db_init is idempotent), and TRUNCATEs every user-scoped table
    before and after each test so rows never leak. Skipped when TEST_DATABASE_URL
    is unset.

    Truncation (not transactional rollback) is deliberate: the models do
    `from db import get_db` and each request opens its own connection, so a
    rollback held on a separate test connection would never see the app's writes.
    """
    if not _TEST_DB_URL:
        pytest.skip("TEST_DATABASE_URL not set — skipping DB-backed test")

    import psycopg

    db_init.init_db()  # idempotent — safe before every DB test

    def _truncate():
        with psycopg.connect(_TEST_DB_URL) as conn:
            with conn.cursor() as cur:
                # Fixed identifier list (test constant) — not user input.
                cur.execute(
                    "TRUNCATE {} RESTART IDENTITY CASCADE".format(
                        ", ".join(_USER_TABLES)
                    )
                )
            conn.commit()

    _truncate()  # clean slate going in
    yield
    _truncate()  # clean slate for the next test


@pytest.fixture
def auth_client(client, get_csrf_token, db):
    """
    A test client with a freshly-registered, logged-in user.

    Depends on `db`, so it is skipped without TEST_DATABASE_URL. Registration
    sets the session, so the returned client is authenticated. Returns
    (client, user_dict).
    """
    token = get_csrf_token(client)
    resp = client.post(
        "/api/auth/register",
        headers={"X-CSRF-Token": token},
        json={"email": "test@example.com", "password": "Testpass123"},
    )
    assert resp.status_code == 201, resp.get_data(as_text=True)
    return client, resp.get_json()["user"]
