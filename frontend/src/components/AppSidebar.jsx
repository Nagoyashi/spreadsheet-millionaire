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
// Light design language (white panel, border-r gray-200, blue-50/blue-700 active
// state, amber reserved for the wordmark brand accent) — matches the marketing
// redesign handoff and the HeroAppPreview mockup that imitates this sidebar.
//
// Structure: three SIBLING top-level categories, each icon + label, same tier:
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
      <aside className="w-16 shrink-0 bg-white border-r border-gray-200 flex flex-col h-full items-center">
        <button
          onClick={toggleCollapsed}
          className="mt-4 mb-3 p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition"
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
              onCalculators
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
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
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
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
    <aside className="w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Brand + collapse / mobile-close controls */}
      <div className="px-5 py-5 border-b border-gray-200 flex items-center justify-between gap-2">
        <Link to="/" className="text-xl font-bold text-gray-900 tracking-tight truncate">
          Spreadsheet<span className="text-amber-600">Millionaire</span>
        </Link>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={toggleCollapsed}
            className="hidden lg:flex text-gray-400 hover:text-gray-900 p-1 rounded transition"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <ChevronsLeft className="w-5 h-5" />
          </button>
          {onClose && (
            <button
              className="lg:hidden text-gray-400 hover:text-gray-900 p-1"
              onClick={onClose}
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Three sibling top-level categories */}
      <nav className="px-3 py-3 border-b border-gray-100 overflow-y-auto">
        {/* 📊 Calculators — expandable; sub-items render muted */}
        <button
          onClick={() => setCalcsOpen((o) => !o)}
          className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 sm:py-2 rounded-lg text-sm transition ${
            onCalculators
              ? 'bg-blue-50 text-blue-700 font-semibold'
              : 'font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <span className="flex items-center gap-3">
            <BarChart2 className={itemIcon} />
            Calculators
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 ${calcsOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {calcsOpen && (
          <div className="mt-0.5 mb-1 ml-2 pl-2 border-l border-gray-100 space-y-0.5">
            {publishedCalculators.map(({ type, label, Icon, color }) => {
              const active = type === activeCalcType
              return (
                <Link
                  key={type}
                  to={`/app/calculator/${type}`}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
                    active
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
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
              className={`mt-1 flex items-center gap-3 px-3 py-2.5 sm:py-2 rounded-lg text-sm transition ${
                active
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Icon className={itemIcon} />
              <span className="truncate">{label}</span>
            </Link>
          )
        })}

        {/* Coming soon — teasers for not-yet-revealed trackers (production). */}
        {visibleUpcoming.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Coming soon
            </p>
            {visibleUpcoming.map(({ slug, label, Icon }) => (
              <Link
                key={slug}
                to={`/app/coming-soon/${slug}`}
                onClick={onClose}
                className="flex items-center justify-between gap-2.5 px-3 py-2.5 sm:py-2 rounded-lg text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition"
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon className="w-4 h-4 shrink-0 opacity-60" />
                  <span className="truncate">{label}</span>
                </span>
                <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-gray-100 text-gray-500">
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
      <div className="px-4 py-4 border-t border-gray-200 shrink-0">
        {auth.isAuthenticated ? (
          <UserFooter auth={auth} variant="compact" />
        ) : (
          <div className="space-y-2">
            <Link
              to="/login"
              className="block w-full px-3 py-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition text-sm"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="block w-full px-3 py-2 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition text-center"
            >
              Create account
            </Link>
          </div>
        )}
      </div>
    </aside>
  )
}
