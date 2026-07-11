import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { initSentry } from './sentry'
import { initPostHog } from './posthog'
import { analytics } from './api/analytics'
import App from './App.jsx'

// Before first render so the SDK is armed for any error the app throws on mount.
// No-op unless VITE_SENTRY_DSN is set at build time.
initSentry()

// Product analytics — no-op unless VITE_POSTHOG_KEY is set. Init first, then run
// the session counter so a returning user's second_session can fire on boot.
initPostHog()
analytics.trackSession()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
