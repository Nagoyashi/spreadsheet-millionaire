"""Smoke test for the liveness probe — proves the harness wires create_app()."""


def test_health_returns_ok(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.get_json() == {"status": "ok"}
