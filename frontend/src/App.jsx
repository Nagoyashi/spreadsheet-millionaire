import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { authApi } from './api/authApi'
import MarketingLandingPage from './pages/MarketingLandingPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import ImprintPage from './pages/ImprintPage'
import LandingPage from './pages/LandingPage'
import CalculatorPage from './pages/CalculatorPage'
import ComingSoonPage from './pages/ComingSoonPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import SettingsPage from './pages/SettingsPage'

// Authenticated users hitting a guest-only door (login/register) bounce into the
// app, not the marketing page — they're already past the front door.
function RequireGuest({ isAuthenticated, children }) {
  if (isAuthenticated) return <Navigate to="/app" replace />
  return children
}

function RequireAuth({ isAuthenticated, children }) {
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: '/app/settings' }} />
  return children
}

// Param-preserving redirects from the pre-Phase-6 top-level paths to their new
// homes under /app. <Navigate> does not substitute route params on its own, so
// these tiny wrappers read the param and rebuild the target. Existing links and
// staging bookmarks (/calculator/fire, /coming-soon/net-worth) keep working.
function RedirectCalculator() {
  const { type } = useParams()
  return <Navigate to={`/app/calculator/${type}`} replace />
}

function RedirectComingSoon() {
  const { slug } = useParams()
  return <Navigate to={`/app/coming-soon/${slug}`} replace />
}

export default function App() {
  const auth = useAuth()
  const [csrfReady, setCsrfReady] = useState(false)

  // Fetch CSRF token on mount and wait for it before rendering.
  // This guarantees the token is in memory before any form submission.
  // Runs in parallel with useAuth's getStatus() call — both resolve
  // before anything renders, keeping startup time minimal.
  useEffect(() => {
    authApi.fetchCsrfToken().finally(() => setCsrfReady(true))
  }, [])

  // Block rendering until both auth status and CSRF token are ready
  if (auth.loading || !csrfReady) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <span className="font-mono text-stone-500 text-sm tracking-widest animate-pulse">
          LOADING
        </span>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public marketing surface ─────────────────────────────────────── */}
        <Route path="/" element={<MarketingLandingPage auth={auth} />} />
        <Route path="/privacy" element={<PrivacyPage auth={auth} />} />
        <Route path="/terms" element={<TermsPage auth={auth} />} />
        <Route path="/imprint" element={<ImprintPage auth={auth} />} />

        {/* ── The app, namespaced under /app ───────────────────────────────── */}
        <Route path="/app" element={<LandingPage auth={auth} />} />
        <Route path="/app/calculator/:type" element={<CalculatorPage auth={auth} />} />
        <Route path="/app/coming-soon/:slug" element={<ComingSoonPage />} />
        <Route
          path="/app/settings"
          element={
            <RequireAuth isAuthenticated={auth.isAuthenticated}>
              <SettingsPage auth={auth} />
            </RequireAuth>
          }
        />

        {/* ── Redirects from the old top-level app paths (param-preserving) ─── */}
        <Route path="/calculator/:type" element={<RedirectCalculator />} />
        <Route path="/coming-soon/:slug" element={<RedirectComingSoon />} />
        <Route path="/settings" element={<Navigate to="/app/settings" replace />} />

        {/* ── Shared auth doors — top-level, reachable from marketing and app ─ */}
        <Route
          path="/login"
          element={
            <RequireGuest isAuthenticated={auth.isAuthenticated}>
              <LoginPage auth={auth} />
            </RequireGuest>
          }
        />
        <Route
          path="/register"
          element={
            <RequireGuest isAuthenticated={auth.isAuthenticated}>
              <RegisterPage auth={auth} />
            </RequireGuest>
          }
        />

        {/* Password reset — public; reachable while logged out via the email link */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
