import { posthog } from '../posthog'
import { ANALYTICS_SESSION_KEY, ANALYTICS_ONCE_KEY } from '../constants'

// Central activation-funnel instrumentation (#177). Every funnel event is a named
// helper here so call sites stay declarative and the event names + payload shapes
// live in one place. All helpers no-op unless PostHog actually loaded (no
// VITE_POSTHOG_KEY → posthog.__loaded is false), so callers need no guard.
// Payloads carry only non-PII dimensions (invariant 8): calc_type, tracker,
// source — never an email or a financial value.
//
// The funnel: calculator_used → account_created → tracker_first_entry →
// second_session → upgrade_viewed → upgrade_clicked.

const ready = () => Boolean(posthog.__loaded)

function capture(event, props) {
  if (!ready()) return
  if (props === undefined) posthog.capture(event)
  else posthog.capture(event, props)
}

// One-shot guard: run `fn` at most once per browser for `key`, so a reload or a
// second add never re-fires a "first time ever" milestone.
function once(key, fn) {
  try {
    if (localStorage.getItem(key)) return
    localStorage.setItem(key, '1')
  } catch {
    // localStorage unavailable (private mode / disabled) — fall through and fire
    // anyway rather than lose the event; at worst it double-counts, which the
    // funnel tolerates.
  }
  fn()
}

// Inactivity gap that delimits one session from the next (the web-analytics
// convention). A reload within the gap is the same session; a return after it is
// a new one.
const SESSION_GAP_MS = 30 * 60 * 1000

export const analytics = {
  // Tie pre-signup anonymous events to the account once it exists, so the funnel
  // connects calculator_used → account_created for one person. id only — no email
  // is ever sent to PostHog.
  identify: (userId) => {
    if (ready() && userId != null) posthog.identify(String(userId))
  },
  reset: () => {
    if (ready()) posthog.reset()
  },

  calculatorUsed: (calcType) => capture('calculator_used', { calc_type: calcType }),
  accountCreated: () => capture('account_created'),
  trackerFirstEntry: (tracker) =>
    once(ANALYTICS_ONCE_KEY(`tracker_first_entry_${tracker}`), () =>
      capture('tracker_first_entry', { tracker })
    ),
  secondSession: () => capture('second_session'),
  upgradeViewed: (source) => capture('upgrade_viewed', { source }),
  upgradeClicked: (source) => capture('upgrade_clicked', { source }),

  // Called once on app boot. Counts distinct sessions in localStorage and fires
  // second_session exactly once — at the start of the user's 2nd session.
  trackSession: () => {
    let last = 0
    let count = 0
    try {
      const raw = localStorage.getItem(ANALYTICS_SESSION_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        last = parsed.last || 0
        count = parsed.count || 0
      }
    } catch {
      // corrupt or unavailable — treat as the very first session
    }

    const now = Date.now()
    const isNewSession = !last || now - last > SESSION_GAP_MS
    if (isNewSession) count += 1

    try {
      localStorage.setItem(ANALYTICS_SESSION_KEY, JSON.stringify({ last: now, count }))
    } catch {
      // persistence failure is non-fatal — the event just may not fire
    }

    // === 2 (not >= 2) so it fires only on the transition into session two.
    if (isNewSession && count === 2) analytics.secondSession()
  },
}
