import { useState } from 'react'
import AuthCardShell from './AuthCardShell'

// Shared shell for Login and Register pages.
//
// Why this exists:
//   The two pages were ~95% identical — same outer card, same email/password
//   form, same submit-and-handle-errors loop. Only the copy and accent colours
//   differ. This component owns the form mechanics; the parent supplies the
//   strings and the submit handler. The page chrome (gray page, top bar, white
//   card, badge/title/subtitle/footer) lives in <AuthCardShell>, which the
//   forgot/reset pages also use so the whole auth family looks identical.
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
//   belowPassword          — optional JSX under the password field (e.g. the
//                            "Forgot password?" link on the login page)
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
  belowPassword,
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
    <AuthCardShell badge={badge} badgeClass={badgeClass} title={title} subtitle={subtitle} footer={footer}>
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
            inputMode="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
            placeholder="you@example.com"
            className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm"
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
            className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm"
          />
          {fieldErrors.password && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.password[0]}</p>
          )}
          {belowPassword && <div className="mt-2 text-right">{belowPassword}</div>}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white px-4 py-2.5 sm:py-2 rounded-lg hover:bg-blue-700 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? submittingLabel : submitLabel}
        </button>
      </form>
    </AuthCardShell>
  )
}
