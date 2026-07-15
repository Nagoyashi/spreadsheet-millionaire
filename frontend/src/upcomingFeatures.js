import { Wallet, ArrowRightLeft } from 'lucide-react'

// ─── Upcoming trackers — build-in-public teasers ─────────────────────────────
//
// This is the ONE place the two upcoming trackers are defined. It is
// deliberately NOT part of the calculator registry (calculators/registry.js).
//
// Why separate from the registry:
//   The registry's consumers — the save flow, the explainer banner, the
//   routing guard, and the backend's VALID_CALC_TYPES — all treat every entry
//   as a working, saveable calculator. Trackers are none of those things yet:
//   they have no component, no saved-data shape, no backend type. Putting them
//   in the registry would leak non-calculators into all of those surfaces.
//   So teasers live here, and only the two teaser surfaces (the LandingPage
//   grid and the CalculatorSidebar "Coming soon" section) consume this list.
//
// The real tracker architecture (own registry vs. ad-hoc) is still open — see
// DECISIONS.md § "Decisions still to make → Tracker architecture". This module
// is teaser metadata only, not that decision.
//
// Shape: { slug, label, Icon, blurb, eta, published }
//   slug      — URL segment for /coming-soon/:slug (unique)
//   label     — display name
//   Icon      — lucide-react icon component
//   blurb     — one-paragraph description for the coming-soon page
//   eta       — short status string, e.g. "In development"
//   published — build-time DEFAULT only, mirroring the backend seed
//               (publishable.DEFAULT_PUBLISHED_PUBLISHABLE) — the offline
//               fallback for usePublished.js. Live visibility stays the
//               runtime DB toggle. Both trackers are live (v0.15.3).

export const UPCOMING_FEATURES = [
  {
    slug: 'net-worth',
    label: 'Net Worth Tracker',
    Icon: Wallet,
    blurb:
      'Track everything you own and owe in one place, watch your net worth trend over time, and see the single number that matters most move in the right direction.',
    eta: 'In development',
    published: true,
  },
  {
    slug: 'income-expenses',
    label: 'Income & Expense Tracker',
    Icon: ArrowRightLeft,
    blurb:
      'Log what comes in and what goes out, categorise your spending, and finally see where your money actually goes each month — the foundation every budget is built on.',
    eta: 'In development',
    published: true,
  },
]

export const UPCOMING_MAP = Object.fromEntries(UPCOMING_FEATURES.map((f) => [f.slug, f]))
