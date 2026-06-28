import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom'
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
import WealthPage from './pages/WealthPage'
import IncomeExpensePage from './pages/IncomeExpensePage'
import AdminPage from './pages/admin/AdminPage'
import { NET_WORTH_ENABLED, INCOME_EXPENSE_ENABLED } from './featureFlags'

// Authenticated users hitting a guest-only door (login/register) bounce into the
// app, not the marketing page — they're already past the front door.
function RequireGuest({ isAuthenticated, children }) {
  if (isAuthenticated) return <Navigate to="/app" replace />
  return children
}

function RequireAuth({ isAuthenticated, children }) {
  // Capture the actual path so login can bounce the user back where they were
  // headed (settings, the net-worth tracker, …), not a hardcoded destination.
  const location = useLocation()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children
}

// Admin-only gate for /admin. Non-admins (anonymous OR a normal logged-in user)
// are redirected to the homepage — the portal stays invisible, mirroring the
// server's 404 posture (admin_required). Admin status comes from the session
// user's is_admin flag (auth/status), which the backend keeps as the one source.
function RequireAdmin({ user, children }) {
  if (!user?.is_admin) return <Navigate to="/" replace />
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
          path="/app/net-worth"
          element={
            // Ships dark: when the flag is off (production), the tracker is not
            // reachable — fall back to its "coming soon" teaser. Enabled in
            // dev/staging. See featureFlags.js / DECISIONS.md.
            NET_WORTH_ENABLED ? (
              <RequireAuth isAuthenticated={auth.isAuthenticated}>
                <WealthPage auth={auth} />
              </RequireAuth>
            ) : (
              <Navigate to="/app/coming-soon/net-worth" replace />
            )
          }
        />
        <Route
          path="/app/income-expenses"
          element={
            // Ships dark like Net Worth — teaser fallback when the flag is off.
            INCOME_EXPENSE_ENABLED ? (
              <RequireAuth isAuthenticated={auth.isAuthenticated}>
                <IncomeExpensePage auth={auth} />
              </RequireAuth>
            ) : (
              <Navigate to="/app/coming-soon/income-expenses" replace />
            )
          }
        />
        <Route
          path="/app/settings"
          element={
            <RequireAuth isAuthenticated={auth.isAuthenticated}>
              <SettingsPage auth={auth} />
            </RequireAuth>
          }
        />

        {/* ── Internal admin portal — admin-only, invisible to everyone else ── */}
        <Route
          path="/admin"
          element={
            <RequireAdmin user={auth.user}>
              <AdminPage auth={auth} />
            </RequireAdmin>
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
