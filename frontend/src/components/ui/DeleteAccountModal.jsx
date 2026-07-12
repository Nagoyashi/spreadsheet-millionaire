import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'

// Asks the user to confirm account deletion by typing their password.
// Password re-entry is a deliberate friction — it prevents accidental
// deletion and verifies intent before a destructive irreversible action.
//
// Props:
//   onConfirm — (password: string) => void
//   onCancel  — () => void
//   error     — string | null  (e.g. "Incorrect password")
//   loading   — boolean

export default function DeleteAccountModal({ onConfirm, onCancel, error, loading }) {
  const [password, setPassword] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (password.trim()) onConfirm(password)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">

        {/* Warning header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-full bg-red-100 shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Delete account</h3>
            <p className="text-xs text-gray-500">This cannot be undone.</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
          All your data — saved calculations and tracker entries — will be
          permanently deleted. Enter your password to confirm.
        </p>

        {error && (
          <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
            placeholder="Your password"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!password.trim() || loading}
              className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm font-medium disabled:opacity-40"
            >
              {loading ? 'Deleting…' : 'Delete my account'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition text-sm disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
