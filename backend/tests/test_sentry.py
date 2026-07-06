"""
Sentry backend integration — guard behaviour.

Sentry is DSN-gated: no SENTRY_DSN means sentry_sdk.init() is never called, so a
fresh checkout (and the whole test suite) runs with error monitoring off and no
network calls. When a DSN is present, init must run with privacy-leaning defaults
(send_default_pii=False — invariant 8). These tests exercise _init_sentry()
directly by patching Config, so they don't depend on the real env or reload.
"""

import app as app_module
from config import Config


def test_no_dsn_skips_init(monkeypatch):
    """Without SENTRY_DSN, _init_sentry() must not call sentry_sdk.init()."""
    calls = []
    monkeypatch.setattr(Config, "SENTRY_DSN", "")
    monkeypatch.setattr(
        app_module.sentry_sdk, "init", lambda **kw: calls.append(kw)
    )

    app_module._init_sentry()

    assert calls == []


def test_dsn_initialises_with_privacy_defaults(monkeypatch):
    """With a DSN, init runs with send_default_pii=False and passes config through."""
    calls = []
    monkeypatch.setattr(
        Config, "SENTRY_DSN", "https://public@o0.ingest.sentry.io/1"
    )
    monkeypatch.setattr(Config, "SENTRY_ENVIRONMENT", "production")
    monkeypatch.setattr(Config, "SENTRY_TRACES_SAMPLE_RATE", 0.25)
    monkeypatch.setattr(Config, "SENTRY_RELEASE", "v0.14.0")
    monkeypatch.setattr(
        app_module.sentry_sdk, "init", lambda **kw: calls.append(kw)
    )

    app_module._init_sentry()

    assert len(calls) == 1
    kw = calls[0]
    assert kw["dsn"] == "https://public@o0.ingest.sentry.io/1"
    assert kw["send_default_pii"] is False
    assert kw["environment"] == "production"
    assert kw["traces_sample_rate"] == 0.25
    assert kw["release"] == "v0.14.0"


def test_create_app_boots_without_dsn(app):
    """The app fixture builds via create_app() with no DSN — Sentry stays off."""
    # If _init_sentry() raised or tried to reach Sentry without a DSN, the `app`
    # fixture (which calls create_app()) would have failed before reaching here.
    assert app is not None
