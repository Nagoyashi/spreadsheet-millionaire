import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { initSentry } from './sentry'
import App from './App.jsx'

// Before first render so the SDK is armed for any error the app throws on mount.
// No-op unless VITE_SENTRY_DSN is set at build time.
initSentry()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
