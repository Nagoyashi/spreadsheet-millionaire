"""
publishable.py
--------------
The full set of things the admin Overview can publish/unpublish: the 12
calculators PLUS the two trackers (Net Worth, Income & Expense).

Calculators are the canonical `calc_types.VALID_CALC_TYPES`. Trackers are not
calculators (no saved-data shape, no registry entry — see upcomingFeatures.js),
but their *visibility* now rides the same runtime publish mechanism as
calculators: a row in `calculator_publish` the admin toggles and the public app
reads at runtime. This replaces the build-time `VITE_*_ENABLED` feature flags —
revealing a tracker out of "coming soon" is now an admin toggle, not a redeploy.

Tracker slugs match their route segment + their upcomingFeatures.js slug
(`/app/<slug>`), so the frontend needs no extra mapping. The build-in-public
rollout is complete (v0.15.3): all calculators AND both trackers default
published. The DB stays the runtime source of truth — an admin can still
unpublish any surface live.
"""

from calc_types import VALID_CALC_TYPES, DEFAULT_PUBLISHED_TYPES

# Slugs for the two trackers — must match upcomingFeatures.js slugs and the
# /app/<slug> routes (net-worth → /app/net-worth, income-expenses → /app/income-expenses).
TRACKER_TYPES = (
    "net-worth",
    "income-expenses",
)

# Everything the Overview screen lists and can toggle.
PUBLISHABLE_TYPES = tuple(VALID_CALC_TYPES) + TRACKER_TYPES

# Default published set seeds calculator_publish: everything on — all twelve
# calculators and both trackers (rollout complete).
DEFAULT_PUBLISHED_PUBLISHABLE = set(DEFAULT_PUBLISHED_TYPES) | set(TRACKER_TYPES)
