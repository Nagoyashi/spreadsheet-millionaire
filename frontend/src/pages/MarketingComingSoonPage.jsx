import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import MarketingNav from '../marketing/MarketingNav'
import MarketingFooter from '../marketing/MarketingFooter'

// Beta placeholder for a marketing section whose full surface ships in a later
// cycle (Guide / Comparison / ETFs & Stocks). Same stone canvas + nav + footer
// as the rest of the marketing site; title/blurb are passed per route in App.jsx
// so one component serves all three.
export default function MarketingComingSoonPage({ auth, title, blurb }) {
  useDocumentTitle(`${title} — Coming soon · SpreadsheetMillionaire`)

  return (
    <div className="min-h-screen bg-stone-950 text-white flex flex-col">
      <MarketingNav auth={auth} />

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-xl text-center py-20 sm:py-28">
          <span className="inline-block px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-5">
            Coming soon
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{title}</h1>
          <p className="mt-4 text-stone-400 leading-relaxed">{blurb}</p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <Link
              to="/app"
              className="inline-flex items-center gap-2 bg-amber-400 text-stone-950 font-semibold px-5 py-2.5 rounded-lg hover:bg-amber-300 transition"
            >
              Try the calculators <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/" className="text-stone-300 hover:text-white px-4 py-2.5 text-sm transition">
              Back home
            </Link>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  )
}
