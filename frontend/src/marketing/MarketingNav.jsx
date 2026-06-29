import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X, ChevronDown } from 'lucide-react'

// Top navigation for the public marketing surface.
//
// Layout (desktop): a three-column grid — the wordmark sits left, the section
// links are centered, and the auth control sits right. Anonymous visitors get a
// non-clickable "Login App" control that reveals Login / Register on hover or
// keyboard focus; an authenticated visitor gets a single "Open app" button
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
    <span className="text-lg sm:text-xl font-bold text-white tracking-tight">
      Spreadsheet<span className="text-amber-400">Millionaire</span>
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
        className="inline-flex items-center gap-1 min-h-[44px] px-3 text-sm font-semibold text-stone-200 hover:text-white transition cursor-default"
      >
        Login App
        <ChevronDown className="w-4 h-4" />
      </button>
      <div className="absolute right-0 top-full pt-2 hidden group-hover:block group-focus-within:block">
        <div className="w-40 rounded-lg border border-white/10 bg-stone-900 shadow-xl p-1.5">
          <Link
            to="/login"
            onClick={onNavigate}
            className="block px-3 py-2 rounded-md text-sm text-stone-200 hover:bg-white/10 hover:text-white transition"
          >
            Login
          </Link>
          <Link
            to="/register"
            onClick={onNavigate}
            className="block px-3 py-2 rounded-md text-sm text-stone-200 hover:bg-white/10 hover:text-white transition"
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

  const sectionLinks = SECTIONS.map((s) => (
    <Link
      key={s.label}
      to={s.to}
      onClick={close}
      className="flex items-center min-h-[44px] text-sm text-stone-300 hover:text-white transition"
    >
      {s.label}
    </Link>
  ))

  const openAppCta = (
    <Link
      to="/app"
      onClick={close}
      className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg bg-amber-400 text-stone-950 text-sm font-semibold hover:bg-amber-300 transition"
    >
      Open app
    </Link>
  )

  return (
    <header className="sticky top-0 z-40 bg-stone-950/80 backdrop-blur border-b border-white/10">
      <nav className="w-full px-5 sm:px-8 lg:px-12 h-16 grid grid-cols-2 md:grid-cols-[1fr_auto_1fr] items-center">
        {/* Left — wordmark */}
        <Link to="/" onClick={close} className="justify-self-start flex items-center" aria-label="SpreadsheetMillionaire home">
          <Wordmark />
        </Link>

        {/* Center — section links (desktop) */}
        <div className="hidden md:flex items-center gap-7 justify-self-center">{sectionLinks}</div>

        {/* Right — auth control (desktop) + mobile toggle */}
        <div className="justify-self-end flex items-center">
          <div className="hidden md:block">
            {auth.isAuthenticated ? openAppCta : <LoginAppMenu onNavigate={close} />}
          </div>
          <button
            className="md:hidden flex items-center justify-center min-h-[44px] min-w-[44px] -mr-2 text-stone-300 hover:text-white"
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
        <div className="md:hidden border-t border-white/10 bg-stone-950 px-4 py-3">
          <div className="flex flex-col gap-1">{sectionLinks}</div>
          <div className="mt-3 flex flex-col gap-2">
            {auth.isAuthenticated ? (
              openAppCta
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={close}
                  className="inline-flex items-center justify-center min-h-[44px] px-3 text-sm text-stone-300 hover:text-white transition"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={close}
                  className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg bg-amber-400 text-stone-950 text-sm font-semibold hover:bg-amber-300 transition"
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
