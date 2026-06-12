import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import AuthCardShell from '../components/AuthCardShell'
import { authApi } from '../api/authApi'

// /reset-password/:token — choose a new password.
//
// The raw token comes from the route param and is used only to submit the
// reset; it is never written to localStorage, sessionStorage, or a cookie.
// On success: a clear "password updated" state linking to sign in.
// On a 400 (invalid / expired / used link): the generic message plus a link to
// request a fresh one. A weak password comes back as a 422 field error.

export default function ResetPasswordPage() {
  const { token } = useParams()

  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [done, setDone]               = useState(false)
  const [error, setError]             = useState(null)   // generic / mismatch
  const [fieldError, setFieldError]   = useState(null)   // password schema error
  const [linkDead, setLinkDead]       = useState(false)  // 400 → invalid/expired

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setFieldError(null)

    if (password !== confirm) {
      setError("Passwords don't match.")
      return
    }

    setSubmitting(true)
    const { ok, status, data } = await authApi.resetPassword(token, password)
    setSubmitting(false)

    if (ok) {
      setDone(true)
      return
    }
    if (status === 400) {
      setLinkDead(true)
      return
    }
    if (status === 422 && data?.errors?.password) {
      setFieldError(data.errors.password[0])
      return
    }
    setError(data?.error || 'Something went wrong.')
  }

  // Dead link — generic, no distinction between unknown / expired / used.
  if (linkDead) {
    return (
      <AuthCardShell
        badge="Reset password"
        badgeClass="bg-red-100 text-red-800"
        title="Link expired"
        subtitle="This reset link is invalid or has expired."
        footer={
          <>
            <Link to="/forgot-password" className="text-blue-600 hover:text-blue-700 font-medium transition">
              Request a new link
            </Link>
            {' · '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium transition">
              Sign in
            </Link>
          </>
        }
      >
        <p className="text-sm text-gray-600 leading-relaxed">
          Reset links can only be used once and expire after 60 minutes. Request
          a fresh one to continue.
        </p>
      </AuthCardShell>
    )
  }

  // Success.
  if (done) {
    return (
      <AuthCardShell
        badge="Done"
        badgeClass="bg-emerald-100 text-emerald-800"
        title="Password updated"
        subtitle="You can now sign in with your new password."
        footer={
          <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium transition">
            Go to sign in
          </Link>
        }
      >
        <div className="flex flex-col items-center text-center gap-3 py-2">
          <div className="p-3 rounded-full bg-emerald-50">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            Your password has been changed. Any other reset links for this account
            are now inactive.
          </p>
        </div>
      </AuthCardShell>
    )
  }

  return (
    <AuthCardShell
      badge="Reset password"
      badgeClass="bg-blue-100 text-blue-800"
      title="Choose a new password"
      subtitle="At least 8 characters, with a letter and a number."
      footer={
        <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium transition">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">New password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoFocus
            placeholder="At least 8 characters"
            className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm"
          />
          {fieldError && (
            <p className="text-xs text-red-500 mt-1">{fieldError}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Confirm new password</label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            placeholder="Re-enter your new password"
            className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white px-4 py-2.5 sm:py-2 rounded-lg hover:bg-blue-700 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </AuthCardShell>
  )
}
