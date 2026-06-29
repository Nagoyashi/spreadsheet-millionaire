import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BarChart2, ChevronDown, ChevronsLeft, ChevronsRight, X } from 'lucide-react'
import { usePublishedCalculators } from '../calculators/usePublished'
import { useLiveTrackers, useVisibleUpcoming } from '../trackers'
import { useSidebarCollapse } from '../hooks/useSidebarCollapse'
import UserFooter from './UserFooter'

// The single in-app sidebar — shared by the calculator landing, every calculator
// page, and both trackers (Net Worth, Income & Expenses). Replaces the two
// earlier forks (the old CalculatorSidebar + LandingPage's inline LandingSidebar).
//
// Structure: three SIBLING top-level categories, each white + icon, same tier:
//   📊 Calculators        — expandable; its calculators render muted (sub-items)
//   📈 Net Worth          — top-level link (only when published)
//   💰 Income & Expenses  — top-level link (only when published)
// Tracker visibility is runtime (DB-backed): they appear here via useLiveTrackers()
// once an admin publishes them, and stay in the muted "Coming soon" section
// (useVisibleUpcoming()) until then.
//
// Collapsible: useSidebarCollapse drives a full (w-64) vs icon-rail (w-16) view;
// the choice persists across navigation. The optional `children` slot renders
// between the nav and the footer (the calculator page injects its saved-calcs
// list there); trackers pass nothing.

const CALCULATORS_HOME = '/app'

export default function AppSidebar({ auth, onClose, children }) {
  const [collapsed, toggleCollapsed] = useSidebarCollapse()
  const { pathname } = useLocation()
  const { publishedCalculators } = usePublishedCalculators()
  const liveTrackers = useLiveTrackers()
  const visibleUpcoming = useVisibleUpcoming()

  const onCalculators = pathname === '/app' || pathname.startsWith('/app/calculator/')
  const activeCalcType = pathname.startsWith('/app/calculator/')
    ? pathname.slice('/app/calculator/'.length)
    : null

  // Calculators starts expanded when you're on a calculator route.
  const [calcsOpen, setCalcsOpen] = useState(onCalculators)

  const railIcon = 'w-5 h-5 shrink-0'
  const itemIcon = 'w-4 h-4 shrink-0'

  // ── Collapsed icon rail ─────────────────────────────────────────────────────
  if (collapsed) {
    return (
      <aside className="w-16 shrink-0 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex flex-col h-full items-center">
        <button
          onClick={toggleCollapsed}
          className="mt-4 mb-3 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
          aria-label="Expand sidebar"
          title="Expand sidebar"
        >
          <ChevronsRight className="w-5 h-5" />
        </button>

        <nav className="flex flex-col items-center gap-1 px-2">
          <Link
            to={CALCULATORS_HOME}
            title="Calculators"
            aria-label="Calculators"
            className={`p-2.5 rounded-lg transition ${
              onCalculators ? 'bg-white/10 text-amber-400' : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <BarChart2 className={railIcon} />
          </Link>

          {liveTrackers.map(({ slug, label, Icon, to }) => {
            const active = pathname.startsWith(to)
            return (
              <Link
                key={slug}
                to={to}
                title={label}
                aria-label={label}
                className={`p-2.5 rounded-lg transition ${
                  active ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className={railIcon} />
              </Link>
            )
          })}
        </nav>
      </aside>
    )
  }

  // ── Full sidebar ────────────────────────────────────────────────────────────
  return (
    <aside className="w-64 shrink-0 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex flex-col h-full">
      {/* Brand + collapse / mobile-close controls */}
      <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between gap-2">
        <Link to="/" className="text-xl font-bold text-white tracking-tight truncate">
          Spreadsheet<span className="text-amber-400">Millionaire</span>
        </Link>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={toggleCollapsed}
            className="hidden lg:flex text-gray-400 hover:text-white p-1 rounded transition"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <ChevronsLeft className="w-5 h-5" />
          </button>
          {onClose && (
            <button
              className="lg:hidden text-gray-400 hover:text-white p-1"
              onClick={onClose}
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Three sibling top-level categories */}
      <nav className="px-3 py-3 border-b border-white/10 overflow-y-auto">
        {/* 📊 Calculators — expandable; sub-items render muted */}
        <button
          onClick={() => setCalcsOpen((o) => !o)}
          className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition ${
            onCalculators ? 'bg-white/10 text-white' : 'text-white hover:bg-white/10'
          }`}
        >
          <span className="flex items-center gap-3">
            <BarChart2 className={`${itemIcon} text-amber-400`} />
            Calculators
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 ${calcsOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {calcsOpen && (
          <div className="mt-0.5 mb-1 ml-2 pl-2 border-l border-white/10 space-y-0.5">
            {publishedCalculators.map(({ type, label, Icon, color }) => {
              const active = type === activeCalcType
              return (
                <Link
                  key={type}
                  to={`/app/calculator/${type}`}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
                    active
                      ? 'bg-white/10 text-white font-medium'
                      : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
                  }`}
                >
                  <Icon className={`${itemIcon} ${active ? color : ''}`} />
                  <span className="truncate">{label}</span>
                </Link>
              )
            })}
          </div>
        )}

        {/* 📈 / 💰 Trackers — top-level siblings, same tier as Calculators */}
        {liveTrackers.map(({ slug, label, Icon, to }) => {
          const active = pathname.startsWith(to)
          return (
            <Link
              key={slug}
              to={to}
              onClick={onClose}
              className={`mt-1 flex items-center gap-3 px-3 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition ${
                active ? 'bg-white/10 text-white' : 'text-white hover:bg-white/10'
              }`}
            >
              <Icon className={`${itemIcon} text-amber-400`} />
              <span className="truncate">{label}</span>
            </Link>
          )
        })}

        {/* Coming soon — teasers for not-yet-revealed trackers (production). */}
        {visibleUpcoming.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-gray-600">
              Coming soon
            </p>
            {visibleUpcoming.map(({ slug, label, Icon }) => (
              <Link
                key={slug}
                to={`/app/coming-soon/${slug}`}
                onClick={onClose}
                className="flex items-center justify-between gap-2.5 px-3 py-2.5 sm:py-2 rounded-lg text-sm text-gray-500 hover:text-gray-300 hover:bg-white/5 transition"
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon className="w-4 h-4 shrink-0 opacity-60" />
                  <span className="truncate">{label}</span>
                </span>
                <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-white/10 text-gray-400">
                  Soon
                </span>
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* Optional slot — the calculator page injects its saved-calcs list here.
          A function child receives `onClose` (defined only in the mobile drawer)
          so loading a record can dismiss the drawer. */}
      {children ? (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {typeof children === 'function' ? children(onClose) : children}
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* Footer — user block when authed, sign-in CTA otherwise. */}
      <div className="px-4 py-4 border-t border-white/10 shrink-0">
        {auth.isAuthenticated ? (
          <UserFooter auth={auth} variant="compact" />
        ) : (
          <div className="space-y-2">
            <Link
              to="/login"
              className="block w-full px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition text-sm"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="block w-full px-3 py-2 rounded-lg bg-amber-400 text-gray-900 font-medium text-sm hover:bg-amber-300 transition text-center"
            >
              Create account
            </Link>
          </div>
        )}
      </div>
    </aside>
  )
}
