import { Github } from 'lucide-react'
import { UPCOMING_FEATURES } from '../upcomingFeatures'
import { GITHUB_URL } from './links'

// The "built in public" strip: the upcoming trackers, driven by UPCOMING_FEATURES
// (never duplicated here — same single source the in-app teasers use). Framed
// honestly as work in progress with a link to the genuinely-public GitHub repo,
// which is the real credibility here: anyone can watch these get built.

export default function ComingSoonStrip() {
  return (
    <section className="border-y border-white/10 bg-white/[0.02]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-10">
          <span className="inline-block px-3 py-1 mb-4 text-xs font-semibold uppercase tracking-wider rounded-full bg-white/5 border border-white/10 text-stone-300">
            Built in public
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            More on the way
          </h2>
          <p className="mt-3 text-sm sm:text-base text-stone-400 max-w-xl mx-auto">
            Trackers are next. The whole thing is open source — follow along, or
            read exactly how it works.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 max-w-3xl mx-auto">
          {UPCOMING_FEATURES.map(({ slug, label, Icon, blurb, eta }) => (
            <div
              key={slug}
              className="flex flex-col rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="inline-flex w-11 h-11 items-center justify-center rounded-lg bg-white/5">
                  <Icon className="w-5 h-5 text-stone-300" />
                </div>
                <span className="px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-full bg-amber-400/10 text-amber-300">
                  {eta}
                </span>
              </div>
              <h3 className="text-base font-bold text-white mb-2">{label}</h3>
              <p className="text-sm text-stone-400 leading-relaxed">{blurb}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 min-h-[44px] px-5 rounded-lg border border-white/15 text-sm font-semibold text-white hover:bg-white/5 transition"
          >
            <Github className="w-4 h-4" />
            View the source on GitHub
          </a>
        </div>
      </div>
    </section>
  )
}
