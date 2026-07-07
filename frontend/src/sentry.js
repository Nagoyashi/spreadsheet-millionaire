import * as Sentry from '@sentry/react'

// Frontend error monitoring — the browser half of the Sentry wiring (backend is
// DECISIONS.md § "Error monitoring via Sentry (backend)"). DSN-gated: without
// VITE_SENTRY_DSN, initSentry() is a no-op and no third-party SDK ever phones
// home, so dev, CI, and a fresh checkout run with monitoring off. Only a build
// that inlines a real VITE_SENTRY_DSN activates it.
//
// Privacy posture (invariant 8; the privacy page lists Sentry as a diagnostics
// sub-processor):
//   - sendDefaultPii: false — no cookies, no request headers, and no inferred IP
//     address are attached to events. Crash reports carry stack traces + browser
//     metadata, not who you are.
//   - No Session Replay and no user-behaviour tracing: tracesSampleRate defaults
//     to 0 (errors only). These profile usage, which our "no behavioural
//     tracking" promise forbids — they stay off unless an operator opts in via
//     VITE_SENTRY_TRACES_SAMPLE_RATE, and even then only sample performance, not
//     record sessions.
// The Sentry static API (captureException, addBreadcrumb, setUser, …) is safe to
// call when init never ran — it no-ops without an active client — so callers
// need no DSN guard of their own.

const DSN = import.meta.env.VITE_SENTRY_DSN

export function initSentry() {
  if (!DSN) return
  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    sendDefaultPii: false,
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE) || 0,
  })
}

export { Sentry }
