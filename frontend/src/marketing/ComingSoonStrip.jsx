import { UPCOMING_FEATURES } from '../upcomingFeatures'

// The upcoming trackers, driven by UPCOMING_FEATURES (never duplicated here —
// same single source the in-app teasers use). Framed honestly as work in
// progress; the "view the source" link lives in the footer, not here.

export default function ComingSoonStrip() {
  return (
    <section className="border-y border-white/10 bg-white/[0.02]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            More on the way
          </h2>
          <p className="mt-3 text-sm sm:text-base text-stone-400 max-w-xl mx-auto">
            Trackers are next, and the whole project is open source.
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
      </div>
    </section>
  )
}
