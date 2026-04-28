import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Home, LogOut, User, X, ChevronDown } from 'lucide-react'
import { CALCULATORS, CATEGORIES } from '../calculators/registry'
import SavedCalculationsSidebar from './SavedCalculationsSidebar'

// CalculatorSidebar — full left panel for the calculator page.
//
// Nav is grouped by category with collapsible sections.
// The active calculator's category is expanded by default.
// All other sections start collapsed to keep the nav manageable at 12+ calculators.

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
  const activeCategory = CALCULATORS.find(c => c.type === activeType)?.category ?? null
  const navCategories  = CATEGORIES.filter(c => c !== 'All')

  // Active category expanded by default, rest collapsed
  const [openCategories, setOpenCategories] = useState(
    () => new Set(activeCategory ? [activeCategory] : [])
  )

  function toggleCategory(cat) {
    setOpenCategories(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  return (
    <aside className="w-64 shrink-0 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex flex-col h-full">

      {/* Brand */}
      <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-white tracking-tight">
          FIN<span className="text-amber-400">trackr</span>
        </Link>
        <button className="md:hidden text-gray-400 hover:text-white" onClick={onClose} aria-label="Close sidebar">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Grouped nav */}
      <nav className="px-3 py-3 border-b border-white/10 overflow-y-auto">

        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition text-sm mb-2"
        >
          <Home className="w-4 h-4 shrink-0" />
          All Calculators
        </Link>

        {navCategories.map(cat => {
          const calcsInCategory = CALCULATORS.filter(c => c.category === cat)
          const isOpen          = openCategories.has(cat)
          const hasActive       = calcsInCategory.some(c => c.type === activeType)

          return (
            <div key={cat} className="mb-1">
              <button
                onClick={() => toggleCategory(cat)}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                  hasActive ? 'text-gray-300' : 'text-gray-600 hover:text-gray-400'
                }`}
              >
                {cat}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && (
                <div className="mt-0.5 space-y-0.5">
                  {calcsInCategory.map(({ type, label, Icon, color }) => (
                    <Link
                      key={type}
                      to={`/calculator/${type}`}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
                        type === activeType
                          ? 'bg-white/10 text-white font-medium'
                          : 'text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${type === activeType ? color : ''}`} />
                      <span className="truncate">{label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
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
