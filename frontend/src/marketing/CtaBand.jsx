import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

// Dark closing CTA band above the footer: slate-900 canvas, one decorative
// emerald growth curve with an amber dashed "target" line pinned to the bottom
// 160px (behind the content — it must never cross the buttons or footnote),
// and the same two CTAs as the hero. Copy is final per the marketing redesign
// handoff.

export default function CtaBand() {
  return (
    <section className="relative overflow-hidden bg-slate-900">
      {/* Decorative growth curve + target line — bottom-pinned, behind content */}
      <svg
        viewBox="0 0 1440 160"
        preserveAspectRatio="none"
        className="pointer-events-none absolute bottom-0 left-0 block w-full h-[160px]"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="ctaArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line
          x1="0"
          y1="26"
          x2="1440"
          y2="26"
          stroke="#d97706"
          strokeWidth="1.5"
          strokeDasharray="6 7"
          opacity="0.3"
        />
        <path
          d="M0 150 C240 146 430 132 640 108 C860 84 1100 58 1440 18 L1440 160 L0 160 Z"
          fill="url(#ctaArea)"
        />
        <path
          d="M0 150 C240 146 430 132 640 108 C860 84 1100 58 1440 18"
          fill="none"
          stroke="#10b981"
          strokeWidth="2"
          opacity="0.4"
        />
      </svg>

      <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-[104px] text-center">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-amber-400 mb-3.5">
          Free · Open source · No signup
        </p>
        <h2 className="text-3xl sm:text-[40px] font-bold tracking-[-0.025em] text-white">
          Your numbers are waiting.
        </h2>
        <p className="mt-4 mx-auto max-w-[460px] text-[17px] leading-relaxed text-slate-400">
          Every calculator and tracker works without an account. Start in under a minute.
        </p>

        <div className="mt-[34px] flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/app"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[50px] px-7 rounded-[10px] bg-white text-slate-900 text-[15px] font-semibold hover:bg-slate-200 transition"
          >
            Try the calculators
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center min-h-[50px] px-7 rounded-[10px] border border-white/25 text-white text-[15px] font-semibold hover:bg-white/5 transition"
          >
            Create a free account
          </Link>
        </div>

        <p className="mt-[22px] text-[13px] text-slate-500">
          No credit card, no trial — it's just free.
        </p>
      </div>
    </section>
  )
}
