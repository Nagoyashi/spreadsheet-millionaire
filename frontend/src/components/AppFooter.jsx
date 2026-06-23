import { Link } from 'react-router-dom'
import { Github } from 'lucide-react'
import { GITHUB_URL } from '../marketing/links'

// Legal/footer chrome for the in-app surface. Rendered once by AppShell, so it
// appears on every /app page (calculator grid, calculator pages, both trackers).
// The grid is reachable without login, so the imprint/privacy/terms links have
// to be reachable from it too. Light theme to match the app (the marketing
// MarketingFooter is dark and lives on the public surface).
//
// Deliberately compact — a single row (copyright left, links right) that wraps
// to two short rows only on narrow screens — so it doesn't dominate the page.

export default function AppFooter() {
  const year = new Date().getFullYear()
  const linkCls = 'text-xs text-gray-500 hover:text-gray-900 transition'

  return (
    <footer className="border-t border-gray-200 mt-8">
      <div className="max-w-7xl mx-auto px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-xs text-gray-400">
          © {year} SpreadsheetMillionaire. All rights reserved.
        </p>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <Link to="/privacy" className={linkCls}>
            Privacy
          </Link>
          <Link to="/terms" className={linkCls}>
            Terms
          </Link>
          <Link to="/imprint" className={linkCls}>
            Imprint
          </Link>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-1.5 ${linkCls}`}
          >
            <Github className="w-3.5 h-3.5" />
            Source
          </a>
        </nav>
      </div>
    </footer>
  )
}
