import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LandingPage from './pages/LandingPage'
import CalculatorPage from './pages/CalculatorPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

// App.jsx owns auth state and passes it down.
// No Context — the component tree is shallow enough that props are clean.

function RequireGuest({ isAuthenticated, children }) {
  // Redirect logged-in users away from /login and /register
  if (isAuthenticated) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const auth = useAuth()

  // Don't render routes until the initial /api/auth/status check resolves.
  // Prevents a flash of the login page for authenticated users.
  if (auth.loading) {
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

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
