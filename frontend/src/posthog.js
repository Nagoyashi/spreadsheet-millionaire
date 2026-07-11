import posthog from 'posthog-js'

// Frontend product analytics — the activation funnel (#177). Key-gated exactly
// like Sentry: without VITE_POSTHOG_KEY, initPostHog() is a no-op and the SDK
// never loads or phones home, so dev, CI, and a fresh checkout run with analytics
// off. Only a build that inlines a real key activates it.
//
// Privacy posture (invariant 8; PostHog is EU-hosted and listed on the privacy
// page as a sub-processor):
//   - EU cloud host (eu.i.posthog.com) so event data stays in the EU.
//   - autocapture: false — we NEVER auto-record clicks or inputs. This is a
//     personal-finance app; autocapture would hoover financial values off the
//     page. Only the explicit funnel capture() calls in api/analytics.js go out.
//   - disable_session_recording: true — no Session Replay, ever (same reason).
//   - capture_pageview / capture_pageleave: false — no behavioural pageview
//     stream; the funnel is discrete named events, not page-by-page tracking.
//   - person_profiles: 'identified_only' — no profile for anonymous visitors; a
//     profile appears only after identify() on register/login.
//   - No PII in payloads (see api/analytics.js): events carry calc_type / tracker
//     / source, never an email or a financial input.
// The posthog static API no-ops until a client is loaded (posthog.__loaded), so
// callers in api/analytics.js need no key guard of their own.

const KEY = import.meta.env.VITE_POSTHOG_KEY
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com'

export function initPostHog() {
  if (!KEY) return
  posthog.init(KEY, {
    api_host: HOST,
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    person_profiles: 'identified_only',
  })
}

export { posthog }
