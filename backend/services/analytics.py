"""
services/analytics.py
---------------------
Admin Analytics data — assembles the payload the /admin Analytics screen renders.

Three sources, each independently gated:
  - Our own DB (always available): signups (total + in-range) and the tier
    breakdown that backs the funnel's Free/Pro/Elite stages.
  - Google Analytics 4 (optional): visitors + traffic sources. GA4 is reached
    server-side via the Data API with a service-account key — credentials never
    touch the client.
  - PostHog (optional, #178): the activation funnel (calculator_used → … →
    upgrade_clicked, the events #177 emits) and real per-calculator usage. Read
    server-side via the HogQL Query API with a personal API key (see
    services/posthog_analytics.py). It's the source of truth for per-calculator
    usage — the GA4 `calc_run` event was never emitted.

Empty-state design: when GA4 isn't configured (no property id / credentials), the
GA-sourced fields come back null and `configured` is false; the UI shows a
"connect GA4" state while still rendering the real signup KPIs. The GA4 client is
imported lazily so the app (and this module) run fine without the
`google-analytics-data` package installed — it's only needed once GA4 is wired.
"""

import json
from datetime import datetime, timezone

from config import Config
from db import get_db
from services import posthog_analytics


class AnalyticsError(Exception):
    """Raised when GA4 is configured but the live fetch can't be completed
    (missing SDK, bad credentials, API error). The route turns it into a labelled
    'GA unavailable' response rather than a 500."""


def is_configured() -> bool:
    return Config.GA4_CONFIGURED


# ---------------------------------------------------------------------------- #
# DB-sourced metrics — always available (these are ours, not GA's)
# ---------------------------------------------------------------------------- #
def _db_metrics(range_days: int) -> dict:
    conn = get_db()
    total_accounts = conn.execute("SELECT COUNT(*) AS n FROM users").fetchone()["n"]
    new_signups = conn.execute(
        "SELECT COUNT(*) AS n FROM users WHERE created_at >= now() - make_interval(days => %s)",
        (range_days,),
    ).fetchone()["n"]
    tier_rows = conn.execute("SELECT tier, COUNT(*) AS n FROM users GROUP BY tier").fetchall()
    tiers = {r["tier"]: r["n"] for r in tier_rows}
    return {
        "total_accounts": total_accounts,
        "new_signups": new_signups,
        "tiers": {
            "free": tiers.get("free", 0),
            "pro": tiers.get("pro", 0),
            "elite": tiers.get("elite", 0),
        },
    }


# ---------------------------------------------------------------------------- #
# GA4-sourced metrics — lazily imported; only runs when configured
# ---------------------------------------------------------------------------- #
def _ga4_credentials():
    from google.oauth2 import service_account  # lazy

    raw = Config.GA4_CREDENTIALS_JSON
    info = None
    if raw.lstrip().startswith("{"):
        info = json.loads(raw)
    else:
        # treat as a path to the key file
        with open(raw, "r", encoding="utf-8") as fh:
            info = json.load(fh)
    return service_account.Credentials.from_service_account_info(
        info, scopes=["https://www.googleapis.com/auth/analytics.readonly"]
    )


def _ga4_metrics(range_days: int) -> dict:
    """Live GA4 fetch. Each sub-report is defensive: a failure in one section
    yields null for that section, not a total failure. Raises AnalyticsError only
    when the client can't be constructed at all (missing SDK / bad creds)."""
    try:
        from google.analytics.data_v1beta import BetaAnalyticsDataClient
        from google.analytics.data_v1beta.types import (
            DateRange,
            Dimension,
            Metric,
            RunReportRequest,
        )
    except ImportError as e:
        raise AnalyticsError(
            "GA4 is configured but the 'google-analytics-data' package isn't "
            "installed. Add it to requirements.txt to enable live analytics."
        ) from e

    try:
        client = BetaAnalyticsDataClient(credentials=_ga4_credentials())
    except Exception as e:  # bad / unreadable credentials
        raise AnalyticsError(f"GA4 credentials could not be loaded: {e}") from e

    prop = f"properties/{Config.GA4_PROPERTY_ID}"
    date_range = [DateRange(start_date=f"{range_days}daysAgo", end_date="today")]

    def _run(dimensions, metrics):
        req = RunReportRequest(
            property=prop,
            date_ranges=date_range,
            dimensions=[Dimension(name=d) for d in dimensions],
            metrics=[Metric(name=m) for m in metrics],
        )
        return client.run_report(req)

    def _safe(fn):
        try:
            return fn()
        except Exception:
            return None

    # Visitors over time (daily sessions).
    def _visitors_over_time():
        resp = _run(["date"], ["sessions"])
        rows = sorted(
            ({"date": r.dimension_values[0].value, "sessions": int(r.metric_values[0].value)}
             for r in resp.rows),
            key=lambda d: d["date"],
        )
        return rows

    # Total visitors over the range.
    def _total_visitors():
        resp = _run([], ["totalUsers"])
        return int(resp.rows[0].metric_values[0].value) if resp.rows else 0

    # Traffic sources by default channel group.
    def _traffic_sources():
        resp = _run(["sessionDefaultChannelGroup"], ["sessions"])
        items = [
            {"source": r.dimension_values[0].value, "sessions": int(r.metric_values[0].value)}
            for r in resp.rows
        ]
        total = sum(i["sessions"] for i in items) or 1
        for i in items:
            i["pct"] = round(100 * i["sessions"] / total, 1)
        return sorted(items, key=lambda i: i["sessions"], reverse=True)

    # Per-calculator runs from the `calc_run` custom event (param `calc_type`).
    def _top_calculators():
        resp = _run(["customEvent:calc_type"], ["eventCount"])
        items = [
            {"calc_type": r.dimension_values[0].value, "runs": int(r.metric_values[0].value)}
            for r in resp.rows
            if r.dimension_values[0].value not in ("(not set)", "")
        ]
        return sorted(items, key=lambda i: i["runs"], reverse=True)

    return {
        "total_visitors": _safe(_total_visitors),
        "visitors_over_time": _safe(_visitors_over_time),
        "traffic_sources": _safe(_traffic_sources),
        "top_calculators": _safe(_top_calculators),
    }


# ---------------------------------------------------------------------------- #
# Public entry point
# ---------------------------------------------------------------------------- #
def get_overview(range_days: int = 30) -> dict:
    """Assemble the Analytics payload. Always includes DB-sourced signups + the
    tier funnel; GA-sourced fields are populated only when GA4 is configured
    (else null, with `configured=false`). Never raises for the unconfigured
    case; an AnalyticsError from a configured-but-broken GA4 surfaces in
    `ga_error` so the UI can label it without the request 500-ing."""
    db = _db_metrics(range_days)
    configured = is_configured()

    ga = {"total_visitors": None, "visitors_over_time": None,
          "traffic_sources": None, "top_calculators": None}
    ga_error = None
    if configured:
        try:
            ga = _ga4_metrics(range_days)
        except AnalyticsError as e:
            ga_error = str(e)

    # PostHog product events (#178): the activation funnel + real per-calculator
    # usage. Independently gated from GA4 — either, both, or neither may be wired.
    # PostHog is the source of truth for calculator usage (the GA4 calc_run event
    # was never emitted), so its top_calculators wins when present.
    posthog_configured = posthog_analytics.is_configured()
    activation_funnel = None
    posthog_error = None
    posthog_top_calculators = None
    if posthog_configured:
        try:
            ph = posthog_analytics.fetch(range_days)
            activation_funnel = ph["activation_funnel"]
            posthog_top_calculators = ph["top_calculators"]
        except posthog_analytics.PostHogError as e:
            posthog_error = str(e)

    top_calculators = (
        posthog_top_calculators if posthog_top_calculators is not None
        else ga["top_calculators"]
    )

    visitors = ga["total_visitors"]
    signups = db["new_signups"]
    signup_rate = round(100 * signups / visitors, 1) if visitors else None

    return {
        "configured": configured,
        "ga_error": ga_error,
        "posthog_configured": posthog_configured,
        "posthog_error": posthog_error,
        "range_days": range_days,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "kpis": {
            "total_visitors": visitors,
            "new_signups": signups,
            "signup_rate": signup_rate,
            "free_to_paid": None,  # billing not live during beta
            # Subscription revenue (MRR) from tier prices — placeholder until
            # billing is wired; then it's summed from active paid subscriptions.
            "revenue": None,
        },
        "visitors_over_time": ga["visitors_over_time"],
        "traffic_sources": ga["traffic_sources"],
        "top_calculators": top_calculators,
        # The activation funnel (#177 events, read via PostHog) — null until
        # PostHog is configured; the admin card shows an empty state.
        "activation_funnel": activation_funnel,
        "funnel": {
            "visitors": visitors,
            "signups": db["total_accounts"],
            "free": db["tiers"]["free"],
            "pro": db["tiers"]["pro"],
            "elite": db["tiers"]["elite"],
        },
        "totals": {"accounts": db["total_accounts"]},
    }
