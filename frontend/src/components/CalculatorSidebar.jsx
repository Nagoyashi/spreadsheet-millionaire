import { Link } from 'react-router-dom'
import { Home, LogOut, User, X } from 'lucide-react'
import { CALCULATORS } from '../calculators/registry'
import SavedCalculationsSidebar from './SavedCalculationsSidebar'

// CalculatorSidebar is the full left-panel used on the calculator page.
// It handles:
//   - Brand / nav links
//   - Per-type calculator nav (derived from registry)
//   - Saved calculations list (authenticated users only)
//   - User footer (email + sign out / sign in to save)
//
// Props:
//   activeType         — current calculator type string (e.g. 'fire')
//   auth               — auth object from useAuth
//   savedCalcs         — list of saved calculations from useCalculatorData
//   calcsLoading       — boolean
//   calcsError         — string | null
//   activeSavedCalcId  — number | null
//   onLoad             — (calc) => void
//   onRename           — (id, name) => void
//   onDelete           — (id) => void
//   onClose            — () => void  (mobile: close overlay)
//   onNavigateLogin    — () => void  (unauthenticated footer button)

export default function CalculatorSidebar({
  activeType,
  auth,
  savedCalcs,
  calcsLoading,
  calcsError,
  activeSavedCalcId,
  onLoad,
  onRename,
  onDelete,
  onClose,
  onNavigateLogin,
}) {
  return (
    <aside className="w-64 shrink-0 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex flex-col h-full">

      {/* Brand */}
      <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-white tracking-tight">
          FIN<span className="text-amber-400">trackr</span>
        </Link>
        {/* Only visible on mobile */}
        <button
          className="md:hidden text-gray-400 hover:text-white"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Calculator nav — auto-generated from registry */}
      <nav className="px-3 py-4 space-y-1 border-b border-white/10">
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition text-sm"
        >
          <Home className="w-4 h-4" />
          All Calculators
        </Link>

        {CALCULATORS.map(({ type, label, Icon, color }) => (
          <Link
            key={type}
            to={`/calculator/${type}`}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
              type === activeType
                ? 'bg-white/10 text-white font-medium'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Icon className={`w-4 h-4 ${type === activeType ? color : ''}`} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Saved calculations */}
      {auth.isAuthenticated ? (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <SavedCalculationsSidebar
            savedCalcs={savedCalcs}
            loading={calcsLoading}
            error={calcsError}
            activeSavedCalcId={activeSavedCalcId}
            onLoad={onLoad}
            onRename={onRename}
            onDelete={onDelete}
          />
        </div>
      ) : (
        <div className="flex-1 px-5 py-4">
          <p className="text-xs text-gray-600 leading-relaxed">
            Sign in to save and reload your calculations.
          </p>
        </div>
      )}

      {/* User footer */}
      <div className="px-4 py-4 border-t border-white/10 shrink-0">
        {auth.isAuthenticated ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-2">
              <User className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span className="text-xs text-gray-500 truncate">{auth.user.email}</span>
            </div>
            <button
              onClick={auth.logout}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition text-sm"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        ) : (
          <button
            onClick={onNavigateLogin}
            className="w-full px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition text-sm text-left"
          >
            Sign in to save
          </button>
        )}
      </div>

    </aside>
  )
}
