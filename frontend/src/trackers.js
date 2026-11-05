import { UPCOMING_FEATURES, UPCOMING_MAP } from './upcomingFeatures'
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

// Nav metadata: short labels + route. Icon, the full title, and the one-line
// card description come from upcomingFeatures.js (the single source for tracker
// copy) so no consumer hand-writes them (#286/#287). Slugs match
// upcomingFeatures.js and the /app/<slug> routes.
//
// Shape: { slug, label, to, Icon, title, description }
//   label       — short nav label ("Net Worth")
//   title       — full product name ("Net Worth Tracker")
//   description — one-line card copy
const TRACKERS = [
  { slug: 'net-worth', label: 'Net Worth', to: '/app/net-worth' },
  { slug: 'income-expenses', label: 'Income & Expenses', to: '/app/income-expenses' },
].map((t) => {
  const { Icon, label: title, description } = UPCOMING_MAP[t.slug]
  return { ...t, Icon, title, description }
})

export function useLiveTrackers() {
  const published = new Set(usePublishedTypes())
  return TRACKERS.filter((t) => published.has(t.slug))
}

export function useVisibleUpcoming() {
  const published = new Set(usePublishedTypes())
  return UPCOMING_FEATURES.filter((f) => !published.has(f.slug))
}
