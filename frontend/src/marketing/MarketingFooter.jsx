import { Link } from 'react-router-dom'
import { Github } from 'lucide-react'
import { GITHUB_URL } from './links'

// Footer for the public surface: legal links, GitHub, the copyright line, and
// the one quiet not-financial-advice line that the Terms spell out in full. Used
// by the marketing landing page and (via shared chrome) the legal pages.
//
// `slim` renders the one-row variant from the marketing-pages handoff (wordmark
// + Privacy/Terms/Imprint + copyright) used by the Guide / Comparison /
// ETFs & Stocks section pages.

const LEGAL_LINKS = [
  { label: 'Privacy', to: '/privacy' },
  { label: 'Terms', to: '/terms' },
  { label: 'Imprint', to: '/imprint' },
]

export default function MarketingFooter({ slim = false }) {
  const year = new Date().getFullYear()

  if (slim) {
    return (
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-6 pt-12 pb-9 flex flex-wrap items-center justify-between gap-6">
          <Link to="/" className="text-base font-bold tracking-[-0.02em] text-gray-900">
            Spreadsheet<span className="text-amber-600">Millionaire</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-x-7 gap-y-3">
            {LEGAL_LINKS.map(({ label, to }) => (
              <Link
                key={label}
                to={to}
                className="text-[13.5px] text-gray-500 hover:text-gray-900 transition"
              >
                {label}
              </Link>
            ))}
          </nav>
          <p className="text-xs text-gray-300">© {year} SpreadsheetMillionaire</p>
        </div>
      </footer>
    )
  }

  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-6xl mx-auto px-6 pt-12 pb-9">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5">
              <Link to="/" className="text-[17px] font-bold tracking-[-0.02em] text-gray-900">
                Spreadsheet<span className="text-amber-600">Millionaire</span>
              </Link>
              <span className="px-[9px] py-[3px] text-[11px] font-semibold uppercase tracking-[0.05em] rounded-full bg-amber-50 text-amber-700">
                Beta
              </span>
            </div>
            <p className="mt-2.5 text-[12.5px] text-gray-400 max-w-[340px] leading-relaxed">
              Calculators are educational tools, not financial advice.
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-x-7 gap-y-3">
            {LEGAL_LINKS.map(({ label, to }) => (
              <Link
                key={label}
                to={to}
                className="text-[13.5px] text-gray-500 hover:text-gray-900 transition"
              >
                {label}
              </Link>
            ))}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 min-h-[40px] px-4 rounded-lg border border-gray-300 text-[13.5px] font-semibold text-gray-900 hover:border-gray-400 transition"
            >
              <Github className="w-4 h-4" />
              View source on GitHub
            </a>
          </nav>
        </div>

        <p className="mt-9 text-xs text-gray-300">
          © {year} SpreadsheetMillionaire. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
