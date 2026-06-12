import { useState } from 'react'
import { LogOut, User, Trash2 } from 'lucide-react'
import DeleteAccountModal from './ui/DeleteAccountModal'

// Authenticated-user footer: shows email, sign-out button, delete-account
// button, and owns the delete confirmation modal state.
//
// Was duplicated across LandingPage and CalculatorSidebar — same buttons,
// same modal handler, same hover treatment. Extracting also fixes a subtle
// pre-existing inconsistency (different icon sizes / spacings) by exposing
// just one variant prop.
//
// Variants:
//   'compact' — used in CalculatorSidebar (denser spacing, smaller email icon)
//   'roomy'   — used in LandingPage      (slightly more breathing room)
//
// Unauthenticated CTAs are NOT here — those differ meaningfully between
// the two parents (LandingPage shows Sign in + Create account, CalculatorSidebar
// shows just "Sign in to save"), so the parent renders its own CTA block.
//
// Usage:
//   {auth.isAuthenticated && <UserFooter auth={auth} variant="compact" />}

export default function UserFooter({ auth, variant = 'compact' }) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteError, setDeleteError]         = useState(null)
  const [deleteLoading, setDeleteLoading]     = useState(false)

  async function handleDeleteConfirm(password) {
    setDeleteLoading(true)
    setDeleteError(null)
    const result = await auth.deleteAccount(password)
    setDeleteLoading(false)
    if (result.success) {
      setShowDeleteModal(false)
    } else {
      setDeleteError(result.error)
    }
  }

  const isCompact   = variant === 'compact'
  const containerCls = isCompact ? 'space-y-1' : 'space-y-2'
  const emailIconCls = isCompact ? 'w-3.5 h-3.5 text-gray-500'  : 'w-4 h-4 text-gray-400'
  const emailTextCls = isCompact ? 'text-xs text-gray-500'       : 'text-xs text-gray-400'

  return (
    <>
      <div className={containerCls}>
        <div className="flex items-center gap-2 px-2">
          <User className={`${emailIconCls} shrink-0`} />
          <span className={`${emailTextCls} truncate`}>{auth.user.email}</span>
        </div>
        <button
          onClick={auth.logout}
          className="flex items-center gap-2 w-full px-3 py-2.5 sm:py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition text-sm"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
        <button
          onClick={() => { setDeleteError(null); setShowDeleteModal(true) }}
          className="flex items-center gap-2 w-full px-3 py-2.5 sm:py-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-white/10 transition text-sm"
        >
          <Trash2 className="w-4 h-4" />
          Delete account
        </button>
      </div>

      {showDeleteModal && (
        <DeleteAccountModal
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteModal(false)}
          error={deleteError}
          loading={deleteLoading}
        />
      )}
    </>
  )
}
