"""
End-to-end tests for the auth surface (routes/auth.py) — the highest-risk
endpoints on a live product.

DB-backed: every test needs the `db` fixture (pulled in via the autouse
`email_mocks` fixture below), so the whole module SKIPS without TEST_DATABASE_URL
and runs in CI against the Postgres service.

Email is mocked at the routes.auth namespace so no real Resend calls happen and
so we can assert on send behaviour (e.g. no reset email for an unknown address).
"""

from unittest.mock import MagicMock

import pytest

import routes.auth as auth_routes
from models.password_reset import PasswordResetToken

PASSWORD = "Testpass123"
NEW_PASSWORD = "Newpass456"


def _register(client, token, email="user@example.com", password=PASSWORD):
    return client.post(
        "/api/auth/register",
        headers={"X-CSRF-Token": token},
        json={"email": email, "password": password},
    )


def _login(client, token, email="user@example.com", password=PASSWORD):
    return client.post(
        "/api/auth/login",
        headers={"X-CSRF-Token": token},
        json={"email": email, "password": password},
    )


def _is_logged_in(client):
    return client.get("/api/auth/status").get_json()["logged_in"]


@pytest.fixture(autouse=True)
def email_mocks(monkeypatch, db):
    """Mock both transactional emails (no real Resend) and require a test DB."""
    welcome = MagicMock(return_value=True)
    reset = MagicMock(return_value=True)
    monkeypatch.setattr(auth_routes, "send_welcome_email", welcome)
    monkeypatch.setattr(auth_routes, "send_password_reset_email", reset)
    return {"welcome": welcome, "reset": reset}


class TestRegister:
    def test_success_sets_session_and_sends_welcome(self, client, get_csrf_token, email_mocks):
        token = get_csrf_token(client)
        resp = _register(client, token, email="new@example.com")

        assert resp.status_code == 201
        assert resp.get_json()["user"]["email"] == "new@example.com"
        assert "password_hash" not in resp.get_json()["user"]
        assert _is_logged_in(client) is True
        email_mocks["welcome"].assert_called_once_with("new@example.com")

    def test_duplicate_email_409(self, app, client, get_csrf_token):
        token = get_csrf_token(client)
        _register(client, token, email="dupe@example.com")

        # Second client so we're not blocked by the "already logged in" guard.
        other = app.test_client()
        other_token = get_csrf_token(other)
        resp = _register(other, other_token, email="dupe@example.com")

        assert resp.status_code == 409
        assert "already exists" in resp.get_json()["error"].lower()

    def test_weak_password_422(self, client, get_csrf_token):
        token = get_csrf_token(client)
        resp = client.post(
            "/api/auth/register",
            headers={"X-CSRF-Token": token},
            json={"email": "weak@example.com", "password": "short"},
        )
        assert resp.status_code == 422
        assert "errors" in resp.get_json()

    def test_already_logged_in_400(self, client, get_csrf_token):
        token = get_csrf_token(client)
        _register(client, token, email="again@example.com")
        resp = _register(client, token, email="again2@example.com")
        assert resp.status_code == 400

    def test_missing_csrf_403(self, client, get_csrf_token):
        get_csrf_token(client)  # establish a session token...
        resp = client.post(  # ...but don't send the header
            "/api/auth/register",
            json={"email": "nocsrf@example.com", "password": PASSWORD},
        )
        assert resp.status_code == 403


class TestLogin:
    def test_success_200(self, app, client, get_csrf_token):
        reg_client = app.test_client()
        reg_token = get_csrf_token(reg_client)
        _register(reg_client, reg_token, email="login@example.com")

        token = get_csrf_token(client)
        resp = _login(client, token, email="login@example.com")
        assert resp.status_code == 200
        assert resp.get_json()["user"]["email"] == "login@example.com"
        assert _is_logged_in(client) is True

    def test_wrong_password_and_unknown_email_are_indistinguishable(self, app, client, get_csrf_token):
        reg_client = app.test_client()
        reg_token = get_csrf_token(reg_client)
        _register(reg_client, reg_token, email="real@example.com")

        token = get_csrf_token(client)
        wrong_pw = _login(client, token, email="real@example.com", password="Wrongpass1")
        unknown = _login(client, token, email="nobody@example.com", password=PASSWORD)

        assert wrong_pw.status_code == 401
        assert unknown.status_code == 401
        assert wrong_pw.get_json() == unknown.get_json()


class TestLogout:
    def test_logout_clears_session(self, client, get_csrf_token):
        token = get_csrf_token(client)
        _register(client, token, email="out@example.com")
        assert _is_logged_in(client) is True

        resp = client.post("/api/auth/logout", headers={"X-CSRF-Token": token})
        assert resp.status_code == 200
        assert _is_logged_in(client) is False


class TestForgotPassword:
    EXPECTED = "If that email exists, a reset link has been sent."

    def test_registered_email_sends_reset_and_uniform_body(self, app, client, get_csrf_token, email_mocks):
        reg = app.test_client()
        reg_token = get_csrf_token(reg)
        _register(reg, reg_token, email="known@example.com")

        token = get_csrf_token(client)
        resp = client.post(
            "/api/auth/forgot-password",
            headers={"X-CSRF-Token": token},
            json={"email": "known@example.com"},
        )
        assert resp.status_code == 200
        assert resp.get_json()["message"] == self.EXPECTED
        email_mocks["reset"].assert_called_once()

    def test_unknown_email_same_body_no_email_sent(self, client, get_csrf_token, email_mocks):
        token = get_csrf_token(client)
        resp = client.post(
            "/api/auth/forgot-password",
            headers={"X-CSRF-Token": token},
            json={"email": "ghost@example.com"},
        )
        assert resp.status_code == 200
        assert resp.get_json()["message"] == self.EXPECTED
        email_mocks["reset"].assert_not_called()

    def test_malformed_email_same_body(self, client, get_csrf_token, email_mocks):
        token = get_csrf_token(client)
        resp = client.post(
            "/api/auth/forgot-password",
            headers={"X-CSRF-Token": token},
            json={"email": "not-an-email"},
        )
        assert resp.status_code == 200
        assert resp.get_json()["message"] == self.EXPECTED
        email_mocks["reset"].assert_not_called()


def _request_reset_token(app, client, get_csrf_token, email_mocks, email="reset@example.com"):
    """Register a user and drive forgot-password, returning the raw reset token."""
    reg = app.test_client()
    reg_token = get_csrf_token(reg)
    _register(reg, reg_token, email=email)

    token = get_csrf_token(client)
    client.post(
        "/api/auth/forgot-password",
        headers={"X-CSRF-Token": token},
        json={"email": email},
    )
    reset_url = email_mocks["reset"].call_args.args[1]
    return token, reset_url.rsplit("/", 1)[-1]


class TestResetPassword:
    def test_unknown_token_generic_400(self, client, get_csrf_token):
        token = get_csrf_token(client)
        resp = client.post(
            "/api/auth/reset-password",
            headers={"X-CSRF-Token": token},
            json={"token": "does-not-exist", "password": NEW_PASSWORD},
        )
        assert resp.status_code == 400

    def test_missing_token_generic_400_before_password_check(self, client, get_csrf_token):
        token = get_csrf_token(client)
        resp = client.post(
            "/api/auth/reset-password",
            headers={"X-CSRF-Token": token},
            json={"password": "short"},  # weak, but token check comes first
        )
        assert resp.status_code == 400  # not 422 — token-first ordering

    def test_valid_token_weak_password_422(self, app, client, get_csrf_token, email_mocks):
        token, raw = _request_reset_token(app, client, get_csrf_token, email_mocks)
        resp = client.post(
            "/api/auth/reset-password",
            headers={"X-CSRF-Token": token},
            json={"token": raw, "password": "short"},
        )
        assert resp.status_code == 422

    def test_valid_token_strong_password_resets_and_is_single_use(self, app, client, get_csrf_token, email_mocks):
        token, raw = _request_reset_token(app, client, get_csrf_token, email_mocks, email="happy@example.com")

        ok = client.post(
            "/api/auth/reset-password",
            headers={"X-CSRF-Token": token},
            json={"token": raw, "password": NEW_PASSWORD},
        )
        assert ok.status_code == 200

        # New password works.
        login_client = app.test_client()
        login_token = get_csrf_token(login_client)
        assert _login(login_client, login_token, email="happy@example.com", password=NEW_PASSWORD).status_code == 200

        # Token is single-use — reusing it now yields the generic 400.
        reuse = client.post(
            "/api/auth/reset-password",
            headers={"X-CSRF-Token": token},
            json={"token": raw, "password": "Third1234"},
        )
        assert reuse.status_code == 400

    def test_reset_invalidates_sibling_tokens(self, app, client, get_csrf_token):
        token = get_csrf_token(client)
        reg = _register(client, token, email="multi@example.com")
        uid = reg.get_json()["user"]["id"]

        # Two valid tokens created directly (the route would otherwise invalidate
        # the earlier one on each forgot-password call).
        with app.app_context():
            t1 = PasswordResetToken.create(uid)
            t2 = PasswordResetToken.create(uid)

        used = client.post(
            "/api/auth/reset-password",
            headers={"X-CSRF-Token": token},
            json={"token": t2, "password": NEW_PASSWORD},
        )
        assert used.status_code == 200

        # The sibling token is now invalidated → generic 400.
        sibling = client.post(
            "/api/auth/reset-password",
            headers={"X-CSRF-Token": token},
            json={"token": t1, "password": "Another123"},
        )
        assert sibling.status_code == 400


class TestDeleteAccount:
    def test_requires_login_401(self, client, get_csrf_token):
        token = get_csrf_token(client)
        resp = client.delete(
            "/api/auth/account",
            headers={"X-CSRF-Token": token},
            json={"password": PASSWORD},
        )
        assert resp.status_code == 401

    def test_missing_password_422(self, client, get_csrf_token):
        token = get_csrf_token(client)
        _register(client, token, email="del1@example.com")
        resp = client.delete(
            "/api/auth/account",
            headers={"X-CSRF-Token": token},
            json={},
        )
        assert resp.status_code == 422

    def test_wrong_password_401(self, client, get_csrf_token):
        token = get_csrf_token(client)
        _register(client, token, email="del2@example.com")
        resp = client.delete(
            "/api/auth/account",
            headers={"X-CSRF-Token": token},
            json={"password": "Wrongpass1"},
        )
        assert resp.status_code == 401

    def test_success_deletes_and_blocks_relogin(self, app, client, get_csrf_token):
        token = get_csrf_token(client)
        _register(client, token, email="del3@example.com")

        resp = client.delete(
            "/api/auth/account",
            headers={"X-CSRF-Token": token},
            json={"password": PASSWORD},
        )
        assert resp.status_code == 200
        assert _is_logged_in(client) is False

        login_client = app.test_client()
        login_token = get_csrf_token(login_client)
        assert _login(login_client, login_token, email="del3@example.com").status_code == 401


class TestChangePassword:
    def test_wrong_current_password_401(self, client, get_csrf_token):
        token = get_csrf_token(client)
        _register(client, token, email="cp1@example.com")
        resp = client.post(
            "/api/auth/change-password",
            headers={"X-CSRF-Token": token},
            json={"current_password": "Wrongpass1", "new_password": NEW_PASSWORD},
        )
        assert resp.status_code == 401

    def test_success_then_login_with_new_password(self, app, client, get_csrf_token):
        token = get_csrf_token(client)
        _register(client, token, email="cp2@example.com")

        resp = client.post(
            "/api/auth/change-password",
            headers={"X-CSRF-Token": token},
            json={"current_password": PASSWORD, "new_password": NEW_PASSWORD},
        )
        assert resp.status_code == 200

        login_client = app.test_client()
        login_token = get_csrf_token(login_client)
        assert _login(login_client, login_token, email="cp2@example.com", password=NEW_PASSWORD).status_code == 200


class TestChangeEmail:
    def test_wrong_password_401(self, client, get_csrf_token):
        token = get_csrf_token(client)
        _register(client, token, email="ce1@example.com")
        resp = client.post(
            "/api/auth/change-email",
            headers={"X-CSRF-Token": token},
            json={"password": "Wrongpass1", "new_email": "ce1-new@example.com"},
        )
        assert resp.status_code == 401

    def test_success_changes_email(self, client, get_csrf_token):
        token = get_csrf_token(client)
        _register(client, token, email="ce2@example.com")
        resp = client.post(
            "/api/auth/change-email",
            headers={"X-CSRF-Token": token},
            json={"password": PASSWORD, "new_email": "ce2-new@example.com"},
        )
        assert resp.status_code == 200
        assert resp.get_json()["user"]["email"] == "ce2-new@example.com"

    def test_duplicate_email_409(self, app, client, get_csrf_token):
        token = get_csrf_token(client)
        _register(client, token, email="ce3@example.com")

        other = app.test_client()
        other_token = get_csrf_token(other)
        _register(other, other_token, email="taken@example.com")

        resp = client.post(
            "/api/auth/change-email",
            headers={"X-CSRF-Token": token},
            json={"password": PASSWORD, "new_email": "taken@example.com"},
        )
        assert resp.status_code == 409
