import { Link } from 'react-router-dom'
import { Github } from 'lucide-react'
import { GITHUB_URL } from './links'

// Footer for the public surface: legal links, GitHub, the copyright line, and
// the one quiet not-financial-advice line that the Terms spell out in full. Used
// by the marketing landing page and (via shared chrome) the legal pages.

export default function MarketingFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <Link to="/" className="text-lg font-bold text-white tracking-tight">
              Spreadsheet<span className="text-amber-400">Millionaire</span>
            </Link>
            <p className="mt-2 text-xs text-stone-500 max-w-sm leading-relaxed">
              Calculators are educational tools, not financial advice.
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link to="/privacy" className="text-sm text-stone-400 hover:text-white transition">
              Privacy
            </Link>
            <Link to="/terms" className="text-sm text-stone-400 hover:text-white transition">
              Terms
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-stone-400 hover:text-white transition"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
          </nav>
        </div>

        <p className="mt-8 text-xs text-stone-600">
          © {year} SpreadsheetMillionaire. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
