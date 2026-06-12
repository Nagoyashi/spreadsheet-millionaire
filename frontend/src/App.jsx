import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { authApi } from './api/authApi'
import LandingPage from './pages/LandingPage'
import CalculatorPage from './pages/CalculatorPage'
import ComingSoonPage from './pages/ComingSoonPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import SettingsPage from './pages/SettingsPage'

function RequireGuest({ isAuthenticated, children }) {
  if (isAuthenticated) return <Navigate to="/" replace />
  return children
}

function RequireAuth({ isAuthenticated, children }) {
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: '/settings' }} />
  return children
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
        <Route path="/" element={<LandingPage auth={auth} />} />

        <Route
          path="/calculator/:type"
          element={<CalculatorPage auth={auth} />}
        />

        <Route path="/coming-soon/:slug" element={<ComingSoonPage />} />

        {/* Password reset — public; reachable while logged out via the email link */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

        <Route
          path="/settings"
          element={
            <RequireAuth isAuthenticated={auth.isAuthenticated}>
              <SettingsPage auth={auth} />
            </RequireAuth>
          }
        />

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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
