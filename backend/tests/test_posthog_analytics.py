"""
Unit tests for the PostHog read-back service (#178). No DB or network — the HTTP
layer (`_query`) is monkeypatched, so these run in the DB-free tier.
"""

import urllib.error

import pytest

import services.posthog_analytics as ph


def test_is_configured_reflects_config(monkeypatch):
    monkeypatch.setattr(ph.Config, "POSTHOG_CONFIGURED", False, raising=False)
    assert ph.is_configured() is False
    monkeypatch.setattr(ph.Config, "POSTHOG_CONFIGURED", True, raising=False)
    assert ph.is_configured() is True


def test_fetch_shapes_funnel_and_top_calculators(monkeypatch):
    """fetch() defaults missing funnel stages to 0, filters blank calc types, and
    runs exactly two queries (funnel counts + per-calculator usage)."""
    calls = []

    def fake_query(hogql):
        calls.append(hogql)
        if "GROUP BY calc_type" in hogql:
            return [["fire", 12], ["compound-interest", 5], ["", 99]]
        return [["calculator_used", 30], ["account_created", 8], ["upgrade_clicked", 1]]

    monkeypatch.setattr(ph, "_query", fake_query)
    out = ph.fetch(30)

    funnel = out["activation_funnel"]
    assert funnel["calculator_used"] == 30
    assert funnel["account_created"] == 8
    assert funnel["upgrade_clicked"] == 1
    assert funnel["tracker_first_entry"] == 0  # absent in the rows → defaulted
    assert set(funnel) == set(ph.FUNNEL_EVENTS)  # every stage always present

    assert out["top_calculators"][0] == {"calc_type": "fire", "runs": 12}
    assert all(c["calc_type"] for c in out["top_calculators"])  # blank row dropped
    assert len(calls) == 2


def test_fetch_propagates_query_error(monkeypatch):
    def boom(_hogql):
        raise ph.PostHogError("nope")

    monkeypatch.setattr(ph, "_query", boom)
    with pytest.raises(ph.PostHogError):
        ph.fetch(30)


def test_query_maps_http_error_to_posthogerror(monkeypatch):
    def raise_http(*_a, **_k):
        raise urllib.error.HTTPError("url", 403, "Forbidden", {}, None)

    monkeypatch.setattr(ph.Config, "POSTHOG_PROJECT_ID", "1", raising=False)
    monkeypatch.setattr(ph.Config, "POSTHOG_API_KEY", "secret", raising=False)
    monkeypatch.setattr(ph.Config, "POSTHOG_HOST", "https://eu.posthog.com", raising=False)
    monkeypatch.setattr(ph.urllib.request, "urlopen", raise_http)

    with pytest.raises(ph.PostHogError):
        ph._query("SELECT 1")
