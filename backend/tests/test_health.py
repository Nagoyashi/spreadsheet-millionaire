"""Smoke tests for the liveness + readiness probes.

The liveness tests prove the harness wires create_app(); the readiness tests
cover the DB-up / DB-down branches and the "log a failing probe, skip a passing
one" logging contract that uptime monitoring relies on.
"""

import logging

import routes.health


def test_health_returns_ok(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.get_json() == {"status": "ok"}


def test_session_cookie_not_secure_in_dev(app):
    """Regression: Talisman defaults session_cookie_secure=True, which marks the
    cookie Secure even in development — browsers that don't treat http://localhost
    as a secure context then drop it and login silently fails. We tie it to the
    environment, so dev (FLASK_ENV=development in the test harness) is not Secure."""
    assert app.config["SESSION_COOKIE_SECURE"] is False


def test_ready_returns_ok_when_db_reachable(client, db):
    """Readiness passes when Postgres answers SELECT 1. Needs TEST_DATABASE_URL
    (via the `db` fixture); skipped otherwise."""
    resp = client.get("/api/health/ready")
    assert resp.status_code == 200
    assert resp.get_json() == {"status": "ok", "checks": {"db": "ok"}}


def test_ready_returns_503_when_db_unreachable(client, monkeypatch):
    """A DB that can't be reached must surface as 503 degraded — the state the
    external uptime monitor alerts on — not a masked 200 or an unhandled 500."""

    def _boom():
        raise RuntimeError("connection refused")

    monkeypatch.setattr(routes.health, "get_db", _boom)
    resp = client.get("/api/health/ready")
    assert resp.status_code == 503
    assert resp.get_json() == {"status": "degraded", "checks": {"db": "down"}}


def test_ready_success_is_not_logged(client, db, caplog):
    """A passing readiness poll is suppressed from the request log (it is polled
    constantly), but still gets a request id."""
    with caplog.at_level(logging.INFO):
        resp = client.get("/api/health/ready")
    assert resp.status_code == 200
    assert resp.headers.get("X-Request-ID")
    assert [r for r in caplog.records if r.name == "app.request"] == []


def test_ready_failure_is_logged(client, monkeypatch, caplog):
    """A failing readiness probe IS logged — it's the outage signal worth keeping
    even though the path is otherwise skipped."""

    def _boom():
        raise RuntimeError("connection refused")

    monkeypatch.setattr(routes.health, "get_db", _boom)
    with caplog.at_level(logging.INFO):
        resp = client.get("/api/health/ready")
    assert resp.status_code == 503
    # The middleware emits the 503 request line (path was skipped only for <400)…
    assert any(
        r.name == "app.request" and getattr(r, "status", None) == 503
        for r in caplog.records
    )
    # …and the endpoint logs the underlying cause with a traceback.
    assert any(r.name == "app.health" and r.exc_info for r in caplog.records)
