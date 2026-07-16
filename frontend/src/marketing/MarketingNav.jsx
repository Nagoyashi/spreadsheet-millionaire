import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, ChevronDown } from 'lucide-react'

// Top navigation for the public marketing surface — light fintech restyle.
//
// Layout (desktop): a three-column grid — the wordmark sits left, the section
// links are centered, and the auth control sits right. Anonymous visitors get a
// non-clickable "Login App" control that reveals Login / Register on hover or
// keyboard focus; an authenticated visitor gets a single blue "Open app" button
// instead (a logged-in user landing on / is NOT auto-redirected — the marketing
// page is theirs to read too). `auth` arrives as a prop from App.jsx, per the
// props-not-Context convention.
//
// Several sections (Guide, Comparison, ETFs & Stocks) are Beta "coming soon"
// pages today — their full surfaces are later release cycles (see project.md
// § Future). Mobile collapses everything into one disclosure panel.

// The centered section links. Guide / Comparison / ETFs route to their
// coming-soon pages for now; Calculators goes straight to the app.
const SECTIONS = [
  { label: 'Guide', to: '/guide' },
  { label: 'Calculators', to: '/app' },
  { label: 'Comparison', to: '/comparison' },
  { label: 'ETFs and Stocks', to: '/etfs-stocks' },
]

function Wordmark() {
  return (
    <span className="text-lg font-bold tracking-[-0.02em] text-gray-900">
      Spreadsheet<span className="text-amber-600">Millionaire</span>
    </span>
  )
}

// Non-clickable "Login App" control: hover (or keyboard focus) reveals a small
// box with Login + Register. The trigger never navigates — clicking it does
// nothing — so it's a plain button. `pt-2` on the panel bridges the gap to the
// trigger so the hover target stays continuous.
function LoginAppMenu({ onNavigate }) {
  return (
    <div className="relative group">
      <button
        type="button"
        aria-haspopup="true"
        className="inline-flex items-center gap-1 min-h-[44px] px-3 text-sm font-semibold text-gray-600 hover:text-gray-900 transition cursor-default"
      >
        Login App
        <ChevronDown className="w-4 h-4" />
      </button>
      <div className="absolute right-0 top-full pt-2 hidden group-hover:block group-focus-within:block">
        <div className="w-40 rounded-lg border border-gray-200 bg-white shadow-[0_8px_24px_-8px_rgba(17,24,39,0.15)] p-1.5">
          <Link
            to="/login"
            onClick={onNavigate}
            className="block px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition"
          >
            Login
          </Link>
          <Link
            to="/register"
            onClick={onNavigate}
            className="block px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function MarketingNav({ auth }) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  // Current-page section link reads as active (design handoff: gray-900 +
  // semibold, others gray-600). /app never matches here — the nav only renders
  // on marketing routes.
  const { pathname } = useLocation()

  const sectionLinks = SECTIONS.map((s) => {
    const active = pathname === s.to
    return (
      <Link
        key={s.label}
        to={s.to}
        onClick={close}
        aria-current={active ? 'page' : undefined}
        className={`flex items-center min-h-[44px] text-sm transition ${
          active ? 'text-gray-900 font-semibold' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        {s.label}
      </Link>
    )
  })

  const openAppCta = (
    <Link
      to="/app"
      onClick={close}
      className="inline-flex items-center justify-center h-10 px-[18px] rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
    >
      Open app
    </Link>
  )

  return (
    <header className="sticky top-0 z-40 bg-white/[0.88] backdrop-blur border-b border-gray-200">
      <nav className="max-w-6xl mx-auto px-6 h-16 grid grid-cols-2 md:grid-cols-[1fr_auto_1fr] items-center">
        {/* Left — wordmark */}
        <Link
          to="/"
          onClick={close}
          className="justify-self-start flex items-center"
          aria-label="SpreadsheetMillionaire home"
        >
          <Wordmark />
        </Link>

        {/* Center — section links (desktop) */}
        <div className="hidden md:flex items-center gap-8 justify-self-center">{sectionLinks}</div>

        {/* Right — auth control (desktop) + mobile toggle */}
        <div className="justify-self-end flex items-center">
          <div className="hidden md:block">
            {auth.isAuthenticated ? openAppCta : <LoginAppMenu onNavigate={close} />}
          </div>
          <button
            className="md:hidden flex items-center justify-center min-h-[44px] min-w-[44px] -mr-2 text-gray-600 hover:text-gray-900"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile panel — hover menus don't work on touch, so list everything */}
      {open && (
        <div className="md:hidden border-t border-gray-200 bg-white px-6 py-3">
          <div className="flex flex-col gap-1">{sectionLinks}</div>
          <div className="mt-3 flex flex-col gap-2">
            {auth.isAuthenticated ? (
              openAppCta
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={close}
                  className="inline-flex items-center justify-center min-h-[44px] px-3 text-sm font-medium text-gray-600 hover:text-gray-900 transition"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={close}
                  className="inline-flex items-center justify-center min-h-[44px] px-[18px] rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
