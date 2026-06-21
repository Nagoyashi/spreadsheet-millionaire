"""Smoke test for the liveness probe — proves the harness wires create_app()."""


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
