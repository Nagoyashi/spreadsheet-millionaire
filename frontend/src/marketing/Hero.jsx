import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

// The one thing the page has to land: what this is and why it's worth a click.
// One headline about the real value (a clear path to financial independence),
// one subline, two CTAs. The primary CTA leads straight into the app because
// "usable without signing up" is the product's actual superpower — proving it in
// one click beats describing it. No carousel, no video, no hero illustration.

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Calm amber wash behind the headline — the only flourish on the page,
          a single accent colour doing all the accent work. */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-400/10 to-transparent"
        aria-hidden="true"
      />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-20 pb-16 sm:pt-28 sm:pb-24 text-center">
        <span className="inline-block px-3 py-1 mb-6 text-xs font-semibold uppercase tracking-wider rounded-full bg-white/5 border border-white/10 text-amber-300">
          Free while in beta
        </span>

        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[1.1]">
          See your path to{' '}
          <span className="text-amber-400">financial independence</span>{' '}
          in real numbers.
        </h1>

        <p className="mt-6 text-base sm:text-lg text-stone-300 leading-relaxed max-w-2xl mx-auto">
          Free planning calculators for FIRE, compound growth, debt payoff, and the
          emergency fund that comes first. No signup needed to run any of them —
          create an account only when you want to save your work.
        </p>

        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/app"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-lg bg-amber-400 text-stone-950 text-sm font-semibold hover:bg-amber-300 transition"
          >
            Try the calculators — free, no signup
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center min-h-[48px] px-6 rounded-lg border border-white/15 text-sm font-semibold text-white hover:bg-white/5 transition"
          >
            Create an account
          </Link>
        </div>
      </div>
    </section>
  )
}
