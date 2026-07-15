import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import HeroAppPreview from './HeroAppPreview'

// The one thing the page has to land: what this is and why it's worth a click.
// One badge, one headline, one subline, two CTAs, a trust row, and an
// interactive miniature of the real app. The primary CTA leads straight into
// the app because "usable without signing up" is the product's actual
// superpower — proving it in one click beats describing it.
//
// Copy is final per the marketing redesign handoff — don't reword it.

const TRUST_ITEMS = ['No signup required', 'No ads or trackers', 'Open source']

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="max-w-6xl mx-auto px-6 pt-[88px] text-center">
        <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-white border border-amber-200 text-xs font-semibold uppercase tracking-[0.04em] text-amber-700">
          Free while in beta · Open source
        </span>

        <h1 className="mt-7 mx-auto max-w-[760px] text-[40px] sm:text-6xl font-bold tracking-[-0.03em] text-gray-900 leading-[1.06] [text-wrap:balance]">
          Understand your money.
          <br />
          Plan what comes next.
        </h1>

        <p className="mt-6 mx-auto max-w-[620px] text-lg leading-[1.65] text-gray-600">
          Twelve free, open-source calculators for financial independence, compound growth, debt
          payoff and more — plus net-worth and income &amp; expense trackers to get clear answers
          from your own numbers.
        </p>

        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/app"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[48px] px-[26px] rounded-[10px] bg-blue-600 text-white text-[15px] font-semibold shadow-sm hover:bg-blue-700 transition"
          >
            Try the calculators
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center min-h-[48px] px-[26px] rounded-[10px] bg-white border border-gray-300 text-gray-900 text-[15px] font-semibold hover:border-gray-400 transition"
          >
            Create a free account
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-[13px] text-gray-500">
          {TRUST_ITEMS.map((item) => (
            <span key={item} className="inline-flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-amber-600" strokeWidth={2.5} aria-hidden="true" />
              {item}
            </span>
          ))}
        </div>
      </div>

      <HeroAppPreview />
    </section>
  )
}
