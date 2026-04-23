import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'

// After successful login:
//   1. Restore any calculator state that was saved to sessionStorage before redirect
//   2. Navigate back to wherever the user came from (location.state.from)

export default function LoginPage({ auth }) {
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  const from = location.state?.from || '/'

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setFieldErrors({})

    const result = await auth.login(email, password)

    if (result.success) {
      // sessionStorage restoration happens automatically in CalculatorPage
      // on mount — no action needed here, just navigate back.
      navigate(from, { replace: true })
    } else {
      if (result.errors) setFieldErrors(result.errors)
      else setError(result.error || 'Something went wrong.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col">
      {/* Nav */}
      <nav className="border-b border-stone-800 px-8 py-4">
        <Link to="/" className="font-display text-xl text-stone-100 tracking-tight">
          FIN<span className="text-amber-400">trackr</span>
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <p className="font-mono text-xs text-amber-400 tracking-widest uppercase mb-2">
            Welcome back
          </p>
          <h1 className="font-display text-4xl text-stone-100 mb-8">Sign in</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Global error */}
            {error && (
              <p className="font-body text-sm text-red-400 bg-red-400/10 border border-red-400/20 px-4 py-3">
                {error}
              </p>
            )}

            <div>
              <label className="font-mono text-xs text-stone-500 uppercase tracking-widest block mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full bg-stone-900 border border-stone-700 text-stone-100 font-body text-sm px-4 py-3 focus:outline-none focus:border-amber-400 transition-colors placeholder-stone-600"
                placeholder="you@example.com"
              />
              {fieldErrors.email && (
                <p className="font-body text-xs text-red-400 mt-1">{fieldErrors.email[0]}</p>
              )}
            </div>

            <div>
              <label className="font-mono text-xs text-stone-500 uppercase tracking-widest block mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-stone-900 border border-stone-700 text-stone-100 font-body text-sm px-4 py-3 focus:outline-none focus:border-amber-400 transition-colors placeholder-stone-600"
                placeholder="••••••••"
              />
              {fieldErrors.password && (
                <p className="font-body text-xs text-red-400 mt-1">{fieldErrors.password[0]}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-amber-400 text-stone-950 font-body font-medium text-sm py-3 hover:bg-amber-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="font-body text-sm text-stone-500 mt-6 text-center">
            No account?{' '}
            <Link
              to="/register"
              state={{ from }}
              className="text-amber-400 hover:text-amber-300 transition-colors"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
