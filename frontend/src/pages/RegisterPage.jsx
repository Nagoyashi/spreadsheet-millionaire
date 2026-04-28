import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'

export default function RegisterPage({ auth }) {
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

    const result = await auth.register(email, password)

    if (result.success) {
      navigate(from, { replace: true })
    } else {
      if (result.errors) setFieldErrors(result.errors)
      else setError(result.error || 'Something went wrong.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <Link to="/" className="text-xl font-bold text-gray-800 tracking-tight">
          FIN<span className="text-amber-400">trackr</span>
        </Link>
      </header>

      {/* Centered card */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-sm">
          <div className="mb-6">
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
              Free forever
            </span>
            <h1 className="text-3xl font-bold text-gray-800 mt-3">Create account</h1>
            <p className="text-sm text-gray-500 mt-1">Save and revisit your calculations any time.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="you@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              {fieldErrors.email && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.email[0]}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="At least 8 characters"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              {fieldErrors.password && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.password[0]}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-sm text-gray-500 mt-6 text-center">
            Already have an account?{' '}
            <Link to="/login" state={{ from }} className="text-blue-600 hover:text-blue-700 font-medium transition">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
