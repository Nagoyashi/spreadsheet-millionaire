import { Wallet, ArrowRightLeft } from 'lucide-react'
import { UPCOMING_FEATURES } from './upcomingFeatures'
import { usePublishedTypes } from './calculators/usePublished'

// The published-tracker surface. Tracker visibility is now RUNTIME (DB-backed,
// admin-toggleable) — the same publish mechanism as calculators. A tracker's
// slug (e.g. 'net-worth') is a row in calculator_publish; revealing it out of
// "coming soon" is an admin toggle in /admin Overview, not a redeploy. This
// replaces the old build-time NET_WORTH_ENABLED / INCOME_EXPENSE_ENABLED flags.
//
// useLiveTrackers()    — trackers whose slug is published (real route + nav link).
// useVisibleUpcoming() — the coming-soon teasers (every tracker not yet published).
//
// Both derive from the single runtime published set (usePublishedTypes) — hard
// rule #3's single-source discipline, extended to trackers.

// Nav metadata (short labels for the sidebar/grid). Slugs match upcomingFeatures.js
// and the /app/<slug> routes.
const TRACKERS = [
  { slug: 'net-worth', label: 'Net Worth', Icon: Wallet, to: '/app/net-worth' },
  { slug: 'income-expenses', label: 'Income & Expenses', Icon: ArrowRightLeft, to: '/app/income-expenses' },
]

export function useLiveTrackers() {
  const published = new Set(usePublishedTypes())
  return TRACKERS.filter((t) => published.has(t.slug))
}

export function useVisibleUpcoming() {
  const published = new Set(usePublishedTypes())
  return UPCOMING_FEATURES.filter((f) => !published.has(f.slug))
}
