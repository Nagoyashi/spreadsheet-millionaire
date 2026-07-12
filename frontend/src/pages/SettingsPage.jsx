import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, Download, Sparkles } from 'lucide-react'
import { authApi } from '../api/authApi'
import { analytics } from '../api/analytics'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import DeleteAccountModal from '../components/ui/DeleteAccountModal'

// /settings — account management only (auth-guarded in App.jsx via RequireAuth).
//
// One page, sections stacked: account email, a Premium teaser (the funnel's
// upgrade surface, #177 — premium isn't live yet), change password, change email
// (password-confirmed), a "Your data" export download (#180), and a danger zone
// hosting the existing DeleteAccountModal flow. Deliberately minimal this phase —
// no language, currency, tier, or email-verification settings (see DECISIONS.md).

function SectionCard({ title, description, children }) {
  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 sm:p-6">
      <h2 className="text-base font-semibold text-gray-800">{title}</h2>
      {description && <p className="text-sm text-gray-500 mt-1 mb-4">{description}</p>}
      {children}
    </section>
  )
}

const inputCls =
  'w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm'
const labelCls = 'block text-sm font-medium text-gray-600 mb-1'
const btnCls =
  'bg-blue-600 text-white px-4 py-2.5 sm:py-2 rounded-lg hover:bg-blue-700 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] sm:min-h-0'

function Banner({ kind, children }) {
  const styles = kind === 'success'
    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
    : 'text-red-700 bg-red-50 border-red-200'
  return <div className={`text-sm border px-3 py-2 rounded-lg ${styles}`}>{children}</div>
}

// Premium teaser — the funnel's upgrade surface (#177). Premium isn't built yet
// (monetization is a later phase), so the CTA just registers interest: mounting
// fires upgrade_viewed, clicking fires upgrade_clicked and swaps in a stay-tuned
// note. When real pricing lands, this becomes (or links to) the checkout entry.
function PremiumSection() {
  const [clicked, setClicked] = useState(false)

  useEffect(() => {
    analytics.upgradeViewed('settings')
  }, [])

  return (
    <SectionCard
      title="Premium"
      description="More powerful trackers and saved dashboards are on the way."
    >
      {clicked ? (
        <Banner kind="success">
          Thanks for your interest — Premium is coming soon. We'll let you know the
          moment it's ready.
        </Banner>
      ) : (
        <button
          onClick={() => {
            analytics.upgradeClicked('settings')
            setClicked(true)
          }}
          className={`${btnCls} inline-flex items-center gap-2`}
        >
          <Sparkles className="w-4 h-4" />
          Upgrade to Premium
        </button>
      )}
    </SectionCard>
  )
}

function ChangePasswordSection() {
  const [current, setCurrent]       = useState('')
  const [next, setNext]             = useState('')
  const [confirm, setConfirm]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState(null)
  const [fieldError, setFieldError] = useState(null)
  const [success, setSuccess]       = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null); setFieldError(null); setSuccess(false)

    if (next !== confirm) {
      setError("New passwords don't match.")
      return
    }

    setSubmitting(true)
    const { ok, status, data } = await authApi.changePassword(current, next)
    setSubmitting(false)

    if (ok) {
      setSuccess(true)
      setCurrent(''); setNext(''); setConfirm('')
      return
    }
    if (status === 422 && data?.errors?.new_password) {
      setFieldError(data.errors.new_password[0])
      return
    }
    setError(data?.error || 'Something went wrong.')
  }

  return (
    <SectionCard title="Change password" description="Use at least 8 characters, with a letter and a number.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Banner kind="error">{error}</Banner>}
        {success && <Banner kind="success">Password updated.</Banner>}

        <div>
          <label className={labelCls}>Current password</label>
          <input type="password" value={current} onChange={e => setCurrent(e.target.value)} required className={inputCls} placeholder="Current password" />
        </div>
        <div>
          <label className={labelCls}>New password</label>
          <input type="password" value={next} onChange={e => setNext(e.target.value)} required className={inputCls} placeholder="At least 8 characters" />
          {fieldError && <p className="text-xs text-red-500 mt-1">{fieldError}</p>}
        </div>
        <div>
          <label className={labelCls}>Confirm new password</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required className={inputCls} placeholder="Re-enter new password" />
        </div>

        <button type="submit" disabled={submitting} className={btnCls}>
          {submitting ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </SectionCard>
  )
}

function ChangeEmailSection({ auth }) {
  const [newEmail, setNewEmail]     = useState('')
  const [password, setPassword]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState(null)
  const [fieldError, setFieldError] = useState(null)
  const [success, setSuccess]       = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null); setFieldError(null); setSuccess(false)

    setSubmitting(true)
    const { ok, status, data } = await authApi.changeEmail(password, newEmail)
    setSubmitting(false)

    if (ok) {
      auth.applyUser(data.user)
      setSuccess(true)
      setNewEmail(''); setPassword('')
      return
    }
    if (status === 422 && data?.errors?.new_email) {
      setFieldError(data.errors.new_email[0])
      return
    }
    // 409 duplicate, 401 wrong password, or anything else → generic banner.
    setError(data?.error || 'Something went wrong.')
  }

  return (
    <SectionCard title="Change email" description="Confirm with your current password to change your sign-in email.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Banner kind="error">{error}</Banner>}
        {success && <Banner kind="success">Email updated.</Banner>}

        <div>
          <label className={labelCls}>New email</label>
          <input type="email" inputMode="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required className={inputCls} placeholder="you@example.com" />
          {fieldError && <p className="text-xs text-red-500 mt-1">{fieldError}</p>}
        </div>
        <div>
          <label className={labelCls}>Current password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className={inputCls} placeholder="Current password" />
        </div>

        <button type="submit" disabled={submitting} className={btnCls}>
          {submitting ? 'Saving…' : 'Update email'}
        </button>
      </form>
    </SectionCard>
  )
}

// "Download my data" (#180) — GDPR-style full export. A plain anchor, not an
// API call: the endpoint is a session-cookie GET served with
// Content-Disposition: attachment, so the browser downloads the JSON file
// directly (no fetch → hard rule 4 doesn't apply; CSRF is mutation-only).
function YourDataSection() {
  return (
    <SectionCard
      title="Your data"
      description="Download everything we store for your account — your saved calculations and tracker entries — as a single JSON file."
    >
      <a
        href="/api/auth/account/export"
        download
        className={`${btnCls} inline-flex items-center gap-2 no-underline`}
      >
        <Download className="w-4 h-4" />
        Download my data
      </a>
    </SectionCard>
  )
}

function DangerZone({ auth }) {
  const [showModal, setShowModal]     = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const [deleting, setDeleting]       = useState(false)

  async function handleConfirm(password) {
    setDeleting(true)
    setDeleteError(null)
    const result = await auth.deleteAccount(password)
    setDeleting(false)
    if (result.success) {
      // auth.user is now null — RequireAuth redirects to /login automatically.
      setShowModal(false)
    } else {
      setDeleteError(result.error)
    }
  }

  return (
    <section className="bg-white rounded-lg shadow-sm border border-red-200 p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
        <h2 className="text-base font-semibold text-red-700">Danger zone</h2>
      </div>
      <p className="text-sm text-gray-500 mt-1 mb-4">
        Permanently delete your account and all your data — saved calculations and
        tracker entries. This cannot be undone. You can download a copy first from
        "Your data" above.
      </p>
      <button
        onClick={() => { setDeleteError(null); setShowModal(true) }}
        className="bg-red-600 text-white px-4 py-2.5 sm:py-2 rounded-lg hover:bg-red-700 transition font-medium text-sm min-h-[44px] sm:min-h-0"
      >
        Delete account
      </button>

      {showModal && (
        <DeleteAccountModal
          onConfirm={handleConfirm}
          onCancel={() => setShowModal(false)}
          error={deleteError}
          loading={deleting}
        />
      )}
    </section>
  )
}

export default function SettingsPage({ auth }) {
  useDocumentTitle('Settings — SpreadsheetMillionaire')
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center gap-3">
        <Link to="/app" className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition text-sm min-h-[44px] sm:min-h-0">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </Link>
        <span className="text-xl font-bold text-gray-800 tracking-tight">
          Spreadsheet<span className="text-amber-400">Millionaire</span>
        </span>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-lg mx-auto space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your account.</p>
          </div>

          <SectionCard title="Account">
            <div>
              <span className={labelCls}>Email</span>
              <p className="text-sm text-gray-800 break-all">{auth.user.email}</p>
            </div>
          </SectionCard>

          <PremiumSection />
          <ChangePasswordSection />
          <ChangeEmailSection auth={auth} />
          <YourDataSection />
          <DangerZone auth={auth} />
        </div>
      </main>
    </div>
  )
}
