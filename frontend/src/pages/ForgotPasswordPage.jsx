import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import AuthCardShell from '../components/AuthCardShell'
import { authApi } from '../api/authApi'
import { describeError } from '../api/httpClient'

// /forgot-password — request a reset link.
//
// The backend returns one uniform 200 whether or not the email is registered,
// so this page shows the SAME neutral "check your inbox" state after every
// submit. It never reveals whether an account exists.

export default function ForgotPasswordPage() {
  const [email, setEmail]           = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent]             = useState(false)
  const [error, setError]           = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const result = await authApi.forgotPassword(email)
    setSubmitting(false)
    // The backend returns a uniform 200 for every reachable request (registered
    // or not — no enumeration), so !ok only means a transport/5xx failure, never
    // an account-existence signal. Show an error and let the user retry rather
    // than claiming a link was sent when the request never landed.
    if (!result.ok) {
      setError(describeError(result))
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <AuthCardShell
        badge="Check your inbox"
        badgeClass="bg-blue-100 text-blue-800"
        title="Check your inbox"
        subtitle="If that email is registered, a reset link is on its way."
        footer={
          <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium transition">
            Back to sign in
          </Link>
        }
      >
        <div className="flex flex-col items-center text-center gap-3 py-2">
          <div className="p-3 rounded-full bg-blue-50">
            <MailCheck className="w-7 h-7 text-blue-600" />
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            The link expires in 60 minutes. Didn't get it? Check your spam folder,
            or request another from this page.
          </p>
        </div>
      </AuthCardShell>
    )
  }

  return (
    <AuthCardShell
      badge="Reset password"
      badgeClass="bg-blue-100 text-blue-800"
      title="Forgot password?"
      subtitle="Enter your email and we'll send a reset link."
      footer={
        <>
          Remembered it?{' '}
          <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium transition">
            Sign in
          </Link>
        </>
      }
    >
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
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white px-4 py-2.5 sm:py-2 rounded-lg hover:bg-blue-700 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </AuthCardShell>
  )
}
