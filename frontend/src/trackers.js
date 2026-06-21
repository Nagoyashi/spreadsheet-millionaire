import { Wallet } from 'lucide-react'
import { UPCOMING_FEATURES } from './upcomingFeatures'
import { NET_WORTH_ENABLED } from './featureFlags'

// The published-tracker surface. Mirrors the calculator registry's
// published/coming-soon split (hard rule #3 spirit): every consumer derives
// what to show from these two lists — never re-filters UPCOMING_FEATURES itself.
//
// LIVE_TRACKERS  — trackers revealed to the user (real route + nav link).
// VISIBLE_UPCOMING — the coming-soon teasers, minus anything now live.
//
// A tracker flips from teaser to live by adding it here behind its flag; until
// then it stays in the coming-soon teasers (production behaviour).

export const LIVE_TRACKERS = [
  ...(NET_WORTH_ENABLED
    ? [{ slug: 'net-worth', label: 'Net Worth', Icon: Wallet, to: '/app/net-worth' }]
    : []),
]

const LIVE_SLUGS = new Set(LIVE_TRACKERS.map((t) => t.slug))

export const VISIBLE_UPCOMING = UPCOMING_FEATURES.filter((f) => !LIVE_SLUGS.has(f.slug))
