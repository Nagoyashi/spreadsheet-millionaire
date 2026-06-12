import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Github, Menu, X } from 'lucide-react'
import { GITHUB_URL } from './links'

// Top navigation for the public marketing surface.
//
// Adapts to auth state (passed down from App.jsx, per the props-not-Context
// convention): authenticated visitors see a single "Open app" button; anonymous
// visitors get "Sign in" + "Get started". A logged-in user landing on / is NOT
// auto-redirected into the app — the marketing page is theirs to read too — so
// the nav has to offer them a way through.
//
// Mobile: a single disclosure menu (hamburger toggling a stacked panel) rather
// than the app's full sidebar drawer — a marketing nav has four links, not a
// whole navigation tree, so the heavier drawer would be overkill.

function Wordmark() {
  return (
    <span className="text-lg sm:text-xl font-bold text-white tracking-tight">
      Spreadsheet<span className="text-amber-400">Millionaire</span>
    </span>
  )
}

export default function MarketingNav({ auth }) {
  const [open, setOpen] = useState(false)

  const navLinks = (
    <>
      <Link
        to="/app"
        onClick={() => setOpen(false)}
        className="flex items-center min-h-[44px] text-sm text-stone-300 hover:text-white transition"
      >
        Calculators
      </Link>
      <a
        href={GITHUB_URL}
        target="_blank"
        rel="noreferrer"
        onClick={() => setOpen(false)}
        className="flex items-center gap-1.5 min-h-[44px] text-sm text-stone-300 hover:text-white transition"
      >
        <Github className="w-4 h-4" />
        GitHub
      </a>
    </>
  )

  const authCtas = auth.isAuthenticated ? (
    <Link
      to="/app"
      onClick={() => setOpen(false)}
      className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg bg-amber-400 text-stone-950 text-sm font-semibold hover:bg-amber-300 transition"
    >
      Open app
    </Link>
  ) : (
    <>
      <Link
        to="/login"
        onClick={() => setOpen(false)}
        className="inline-flex items-center justify-center min-h-[44px] px-3 text-sm text-stone-300 hover:text-white transition"
      >
        Sign in
      </Link>
      <Link
        to="/register"
        onClick={() => setOpen(false)}
        className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg bg-amber-400 text-stone-950 text-sm font-semibold hover:bg-amber-300 transition"
      >
        Get started
      </Link>
    </>
  )

  return (
    <header className="sticky top-0 z-40 bg-stone-950/80 backdrop-blur border-b border-white/10">
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center" aria-label="SpreadsheetMillionaire home">
          <Wordmark />
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks}
          <div className="flex items-center gap-2">{authCtas}</div>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden flex items-center justify-center min-h-[44px] min-w-[44px] -mr-2 text-stone-300 hover:text-white"
          onClick={() => setOpen(v => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile panel */}
      {open && (
        <div className="md:hidden border-t border-white/10 bg-stone-950 px-4 py-3">
          <div className="flex flex-col gap-1">{navLinks}</div>
          <div className="mt-3 flex flex-col gap-2">{authCtas}</div>
        </div>
      )}
    </header>
  )
}
