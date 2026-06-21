import { Link } from 'react-router-dom'
import { Github } from 'lucide-react'
import { GITHUB_URL } from '../marketing/links'

// Legal/footer chrome for the in-app surface. The /app calculator grid is
// reachable without login, so the imprint/privacy/terms links have to be
// reachable from it too. Light theme to match the calculator pages (the
// marketing MarketingFooter is dark and lives on the public surface).

export default function AppFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-gray-200 mt-10">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link to="/" className="text-base font-bold text-gray-800 tracking-tight">
              Spreadsheet<span className="text-amber-500">Millionaire</span>
            </Link>
            <p className="mt-1 text-xs text-gray-500">
              Calculators are educational tools, not financial advice.
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link to="/privacy" className="text-sm text-gray-500 hover:text-gray-900 transition">
              Privacy
            </Link>
            <Link to="/terms" className="text-sm text-gray-500 hover:text-gray-900 transition">
              Terms
            </Link>
            <Link to="/imprint" className="text-sm text-gray-500 hover:text-gray-900 transition">
              Imprint
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition"
            >
              <Github className="w-4 h-4" />
              Source
            </a>
          </nav>
        </div>

        <p className="mt-6 text-xs text-gray-400">
          © {year} SpreadsheetMillionaire. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
