"""
IDOR / tenant-isolation tests for saved_calculators — the app's core security
boundary (CLAUDE.md Hard Rule #6: every user-scoped query carries AND user_id).

Two users; user B must never read, update, or delete user A's row, at both the
route layer and the model layer. A future refactor that drops the user_id filter
should turn these red.

Note: there is no per-id GET route (only list/create/update/delete), so the
read-isolation vector is covered via GET /api/calculators (the list).

DB-backed (autouse `_require_db`), so the module skips without TEST_DATABASE_URL
and runs in CI against the Postgres service.
"""

import pytest

from models.calculator import SavedCalculator

PASSWORD = "Testpass123"
CALC_TYPE = "fire"
A_DATA = {"version": 1, "annual_expenses": 40000}


@pytest.fixture(autouse=True)
def _require_db(db):
    """Every test here needs a real DB (and truncation isolation between tests)."""


def _register(client, token, email, password=PASSWORD):
    return client.post(
        "/api/auth/register",
        headers={"X-CSRF-Token": token},
        json={"email": email, "password": password},
    )


def _new_user(app, get_csrf_token, email):
    """Return a fresh logged-in client + its CSRF token for `email`."""
    client = app.test_client()
    token = get_csrf_token(client)
    resp = _register(client, token, email=email)
    assert resp.status_code == 201, resp.get_data(as_text=True)
    return client, token, resp.get_json()["user"]["id"]


def _create_calc(client, token, name="A's plan", data=A_DATA):
    resp = client.post(
        "/api/calculators",
        headers={"X-CSRF-Token": token},
        json={"name": name, "calc_type": CALC_TYPE, "data": data},
    )
    assert resp.status_code == 201, resp.get_data(as_text=True)
    return resp.get_json()["calculator"]["id"]


class TestRouteLevelIDOR:
    def _setup_two_users_with_a_row(self, app, get_csrf_token):
        client_a, token_a, _ = _new_user(app, get_csrf_token, "owner@example.com")
        calc_id = _create_calc(client_a, token_a)
        client_b, token_b, _ = _new_user(app, get_csrf_token, "attacker@example.com")
        return (client_a, token_a, calc_id, client_b, token_b)

    def test_b_cannot_update_a_row(self, app, get_csrf_token):
        _, _, calc_id, client_b, token_b = self._setup_two_users_with_a_row(app, get_csrf_token)
        resp = client_b.put(
            f"/api/calculators/{calc_id}",
            headers={"X-CSRF-Token": token_b},
            json={"name": "pwned"},
        )
        assert resp.status_code == 404

    def test_b_cannot_delete_a_row(self, app, get_csrf_token):
        _, _, calc_id, client_b, token_b = self._setup_two_users_with_a_row(app, get_csrf_token)
        resp = client_b.delete(
            f"/api/calculators/{calc_id}",
            headers={"X-CSRF-Token": token_b},
        )
        assert resp.status_code == 404

    def test_b_list_excludes_a_row(self, app, get_csrf_token):
        _, _, calc_id, client_b, _ = self._setup_two_users_with_a_row(app, get_csrf_token)
        resp = client_b.get("/api/calculators")
        assert resp.status_code == 200
        ids = [c["id"] for c in resp.get_json()["calculators"]]
        assert calc_id not in ids
        assert ids == []

    def test_b_failed_update_does_not_mutate_a_row(self, app, get_csrf_token):
        client_a, token_a, calc_id, client_b, token_b = self._setup_two_users_with_a_row(app, get_csrf_token)
        client_b.put(
            f"/api/calculators/{calc_id}",
            headers={"X-CSRF-Token": token_b},
            json={"name": "pwned", "data": {"version": 1, "annual_expenses": 1}},
        )
        # A re-reads via the list: the row is untouched.
        a_row = next(c for c in client_a.get("/api/calculators").get_json()["calculators"] if c["id"] == calc_id)
        assert a_row["name"] == "A's plan"
        assert a_row["data"] == A_DATA

    def test_a_can_access_own_row(self, app, get_csrf_token):
        client_a, token_a, calc_id, _, _ = self._setup_two_users_with_a_row(app, get_csrf_token)

        upd = client_a.put(
            f"/api/calculators/{calc_id}",
            headers={"X-CSRF-Token": token_a},
            json={"name": "renamed"},
        )
        assert upd.status_code == 200
        assert upd.get_json()["calculator"]["name"] == "renamed"

        ids = [c["id"] for c in client_a.get("/api/calculators").get_json()["calculators"]]
        assert calc_id in ids

        delete = client_a.delete(
            f"/api/calculators/{calc_id}",
            headers={"X-CSRF-Token": token_a},
        )
        assert delete.status_code == 204


class TestUnauthenticated:
    def test_list_requires_auth(self, client):
        assert client.get("/api/calculators").status_code == 401

    def test_create_requires_auth(self, client, get_csrf_token):
        token = get_csrf_token(client)
        resp = client.post(
            "/api/calculators",
            headers={"X-CSRF-Token": token},
            json={"name": "x", "calc_type": CALC_TYPE, "data": A_DATA},
        )
        assert resp.status_code == 401

    def test_update_requires_auth(self, client, get_csrf_token):
        token = get_csrf_token(client)
        resp = client.put(
            "/api/calculators/1",
            headers={"X-CSRF-Token": token},
            json={"name": "x"},
        )
        assert resp.status_code == 401

    def test_delete_requires_auth(self, client, get_csrf_token):
        token = get_csrf_token(client)
        resp = client.delete(
            "/api/calculators/1",
            headers={"X-CSRF-Token": token},
        )
        assert resp.status_code == 401


class TestModelLevelIDOR:
    def test_queries_are_scoped_to_user_id(self, app, get_csrf_token):
        client_a, token_a, a_id = _new_user(app, get_csrf_token, "mowner@example.com")
        _, _, b_id = _new_user(app, get_csrf_token, "mattacker@example.com")
        calc_id = _create_calc(client_a, token_a)

        with app.app_context():
            # Read: A sees it, B does not.
            assert SavedCalculator.get_by_id(calc_id, a_id) is not None
            assert SavedCalculator.get_by_id(calc_id, b_id) is None

            # List: scoped per user.
            assert [c.id for c in SavedCalculator.get_all_for_user(a_id)] == [calc_id]
            assert SavedCalculator.get_all_for_user(b_id) == []

            # Update / delete with the wrong user_id are no-ops.
            assert SavedCalculator.update(calc_id, b_id, name="pwned", data=None) is None
            assert SavedCalculator.delete(calc_id, b_id) is False

            # The row is still intact and owned by A.
            still = SavedCalculator.get_by_id(calc_id, a_id)
            assert still is not None
            assert still.name == "A's plan"

            # Owner delete succeeds (control).
            assert SavedCalculator.delete(calc_id, a_id) is True
            assert SavedCalculator.get_by_id(calc_id, a_id) is None
