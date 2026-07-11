"""
services/posthog_analytics.py
-----------------------------
Reads product-event data back from PostHog for the admin Analytics screen — the
activation funnel (#177's events) and per-calculator usage.

This is the *read* half of the PostHog integration; the browser SDK (#177) is the
*write* half. They use different credentials on purpose:
  - the browser writes with the public project ingest key (VITE_POSTHOG_KEY);
  - this module reads with a **personal API key** (POSTHOG_API_KEY) that carries
    read scope and is a SECRET — server-side only, never shipped to the client.

Transport is stdlib urllib (one POST to the HogQL Query API) — no new dependency,
consistent with the "deliberately boring, justify deps against the problem" rule.

Empty-state design mirrors the GA4 half: when PostHog isn't configured, callers
skip this module entirely; when it IS configured but the fetch fails (bad key,
network, API error), fetch() raises PostHogError so the route can label the card
"unavailable" instead of 500-ing.
"""

import json
import urllib.error
import urllib.request

from config import Config

# The funnel stages, in order — the events the browser SDK emits (#177). Kept in
# this order so the admin card renders the activation sequence top-to-bottom.
FUNNEL_EVENTS = (
    "calculator_used",
    "account_created",
    "tracker_first_entry",
    "second_session",
    "upgrade_viewed",
    "upgrade_clicked",
)

_TIMEOUT_SECONDS = 10


class PostHogError(Exception):
    """Raised when PostHog is configured but the live read can't be completed
    (bad credentials, network error, unexpected response). The route turns it
    into a labelled 'unavailable' response rather than a 500."""


def is_configured() -> bool:
    return Config.POSTHOG_CONFIGURED


def _query(hogql: str) -> list:
    """POST a HogQL query to the PostHog Query API and return its `results` rows.

    Raises PostHogError on any transport/HTTP/shape problem so the caller can
    degrade gracefully."""
    url = f"{Config.POSTHOG_HOST}/api/projects/{Config.POSTHOG_PROJECT_ID}/query/"
    payload = json.dumps({"query": {"kind": "HogQLQuery", "query": hogql}}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {Config.POSTHOG_API_KEY}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=_TIMEOUT_SECONDS) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise PostHogError(f"PostHog Query API returned HTTP {e.code}.") from e
    except (urllib.error.URLError, TimeoutError) as e:
        raise PostHogError(f"PostHog Query API unreachable: {e}.") from e
    except json.JSONDecodeError as e:
        raise PostHogError("PostHog Query API returned a non-JSON response.") from e

    results = body.get("results")
    if not isinstance(results, list):
        raise PostHogError("PostHog Query API response had no results array.")
    return results


def fetch(range_days: int) -> dict:
    """Return {"activation_funnel": {...}, "top_calculators": [...]} for the range.

    range_days is a validated int (the route clamps it), so it's safe to inline
    into the HogQL interval. Raises PostHogError if the API can't be read."""
    since = f"now() - INTERVAL {int(range_days)} DAY"

    # One row per funnel event with its count. Events with zero occurrences won't
    # come back, so we default them to 0 below — every stage always renders.
    event_list = ", ".join(f"'{e}'" for e in FUNNEL_EVENTS)
    funnel_rows = _query(
        f"SELECT event, count() AS c FROM events "
        f"WHERE event IN ({event_list}) AND timestamp >= {since} "
        f"GROUP BY event"
    )
    counts = {e: 0 for e in FUNNEL_EVENTS}
    for row in funnel_rows:
        # rows are [event, count]; ignore anything unexpected defensively.
        if isinstance(row, (list, tuple)) and len(row) >= 2 and row[0] in counts:
            counts[row[0]] = int(row[1])

    # Per-calculator usage from the calculator_used event's calc_type property.
    calc_rows = _query(
        f"SELECT properties.calc_type AS calc_type, count() AS c FROM events "
        f"WHERE event = 'calculator_used' AND timestamp >= {since} "
        f"AND properties.calc_type != '' "
        f"GROUP BY calc_type ORDER BY c DESC"
    )
    top_calculators = [
        {"calc_type": row[0], "runs": int(row[1])}
        for row in calc_rows
        if isinstance(row, (list, tuple)) and len(row) >= 2 and row[0]
    ]

    return {"activation_funnel": counts, "top_calculators": top_calculators}
