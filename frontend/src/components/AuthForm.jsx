import { useState } from 'react'
import { Link } from 'react-router-dom'

// Shared shell for Login and Register pages.
//
// Why this exists:
//   The two pages were ~95% identical — same outer card, same email/password
//   form, same submit-and-handle-errors loop. Only the copy and accent colours
//   differ. This component owns the layout + form mechanics; the parent supplies
//   the strings and the submit handler.
//
// Props:
//   badge / badgeClass     — pill at the top of the card (e.g. "Welcome back")
//   title                  — h1 (e.g. "Sign in")
//   subtitle               — muted line under h1
//   submitLabel            — button text in idle state (e.g. "Sign in")
//   submittingLabel        — button text while submitting (e.g. "Signing in…")
//   passwordPlaceholder    — placeholder text for the password field
//   onSubmit(email, pw)    — async function returning { success, error?, errors? }
//   footer                 — JSX for the "No account?" / "Already have one?" line
//
// Field-level validation errors come back as result.errors (object keyed by
// field name with array of messages); generic errors as result.error (string).

export default function AuthForm({
  badge,
  badgeClass,
  title,
  subtitle,
  submitLabel,
  submittingLabel,
  passwordPlaceholder,
  onSubmit,
  footer,
}) {
  const [email, setEmail]                 = useState('')
  const [password, setPassword]           = useState('')
  const [submitting, setSubmitting]       = useState(false)
  const [error, setError]                 = useState(null)
  const [fieldErrors, setFieldErrors]     = useState({})

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setFieldErrors({})

    const result = await onSubmit(email, password)

    if (result.success) {
      // Parent handles navigation; we just stop loading.
      // Note: we don't setSubmitting(false) on success because the page is
      // about to unmount on navigation anyway. If the parent decides to
      // stay on the page after success, this is harmless.
      return
    }

    if (result.errors) setFieldErrors(result.errors)
    else setError(result.error || 'Something went wrong.')
    setSubmitting(false)
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
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${badgeClass}`}>
              {badge}
            </span>
            <h1 className="text-3xl font-bold text-gray-800 mt-3">{title}</h1>
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
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
                placeholder={passwordPlaceholder}
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
              {submitting ? submittingLabel : submitLabel}
            </button>
          </form>

          <p className="text-sm text-gray-500 mt-6 text-center">
            {footer}
          </p>
        </div>
      </div>
    </div>
  )
}
