import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

// Top navigation for the public marketing surface — light fintech restyle.
//
// Layout (desktop): a three-column grid — the wordmark sits left, the section
// links are centered, and the auth controls sit right. Anonymous visitors get a
// "Log in" text link plus the blue "Open app" button; an authenticated visitor
// gets just "Open app" (a logged-in user landing on / is NOT auto-redirected —
// the marketing page is theirs to read too). `auth` arrives as a prop from
// App.jsx, per the props-not-Context convention.
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

export default function MarketingNav({ auth }) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  const sectionLinks = SECTIONS.map((s) => (
    <Link
      key={s.label}
      to={s.to}
      onClick={close}
      className="flex items-center min-h-[44px] text-sm text-gray-600 hover:text-gray-900 transition"
    >
      {s.label}
    </Link>
  ))

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

        {/* Right — auth controls (desktop) + mobile toggle */}
        <div className="justify-self-end flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4">
            {!auth.isAuthenticated && (
              <Link
                to="/login"
                onClick={close}
                className="flex items-center min-h-[44px] text-sm font-medium text-gray-600 hover:text-gray-900 transition"
              >
                Log in
              </Link>
            )}
            {openAppCta}
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

      {/* Mobile panel — list everything, including Register (desktop reaches it
          via the hero / CTA-band buttons) */}
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
                  Log in
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
