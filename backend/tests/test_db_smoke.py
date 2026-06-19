"""
End-to-end proof that the DB-backed test path works: the Postgres service,
db_init schema creation, the truncation-isolation `db` fixture, and a real
write through the app all wire together.

Uses the `db` fixture, so it SKIPS locally without TEST_DATABASE_URL and runs
in CI against the Postgres service. Comprehensive auth/IDOR/migration coverage
lives in their own issues (#28, #29, #30); this is only the wiring smoke test.
"""


def test_register_persists_through_real_db(db, client, get_csrf_token):
    token = get_csrf_token(client)
    resp = client.post(
        "/api/auth/register",
        headers={"X-CSRF-Token": token},
        json={"email": "smoke@example.com", "password": "Testpass123"},
    )
    assert resp.status_code == 201, resp.get_data(as_text=True)
    assert resp.get_json()["user"]["email"] == "smoke@example.com"


def test_db_fixture_truncates_between_tests(db, client, get_csrf_token):
    # If the previous test's row leaked, this same-email registration would 409;
    # a clean 201 proves the `db` fixture truncated between tests.
    token = get_csrf_token(client)
    resp = client.post(
        "/api/auth/register",
        headers={"X-CSRF-Token": token},
        json={"email": "smoke@example.com", "password": "Testpass123"},
    )
    assert resp.status_code == 201, resp.get_data(as_text=True)
