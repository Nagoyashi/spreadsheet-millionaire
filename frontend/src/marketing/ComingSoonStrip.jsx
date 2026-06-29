import { Link } from 'react-router-dom'
import { BookOpen, Scale, LineChart } from 'lucide-react'
import { UPCOMING_FEATURES } from '../upcomingFeatures'
import CardSlider from './CardSlider'

// Everything on the roadmap, shown as a horizontal slider so the list grows
// sideways instead of stacking. Two sources:
//   - the upcoming trackers (UPCOMING_FEATURES — the same single source the
//     in-app teasers use; never duplicated), and
//   - the upcoming marketing sections (Guide / Comparison / ETFs & Stocks),
//     which each have a Beta "coming soon" page today.
// Each card links to its coming-soon page.

const MARKETING_SOON = [
  {
    slug: 'guide',
    label: 'Guide',
    Icon: BookOpen,
    blurb: 'In-depth guides and articles on FIRE, investing, debt, and building wealth.',
    eta: 'Planned',
    to: '/guide',
  },
  {
    slug: 'comparison',
    label: 'Comparison',
    Icon: Scale,
    blurb: 'Side-by-side comparisons of brokers, accounts, and savings products.',
    eta: 'Planned',
    to: '/comparison',
  },
  {
    slug: 'etfs-stocks',
    label: 'ETFs & Stocks',
    Icon: LineChart,
    blurb: 'A real-time, categorized search across ETFs and stocks.',
    eta: 'Planned',
    to: '/etfs-stocks',
  },
]

const ITEMS = [
  ...UPCOMING_FEATURES.map((f) => ({ ...f, to: `/app/coming-soon/${f.slug}` })),
  ...MARKETING_SOON,
]

export default function ComingSoonStrip() {
  return (
    <section className="border-y border-white/10 bg-white/[0.02]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            More on the way
          </h2>
          <p className="mt-3 text-sm sm:text-base text-stone-400 max-w-xl mx-auto">
            Trackers, guides, comparisons, and a stock & ETF search — and the whole project is open source.
          </p>
        </div>

        <CardSlider label="Upcoming features">
          {ITEMS.map(({ slug, label, Icon, blurb, eta, to }) => (
            <Link
              key={slug}
              to={to}
              className="group shrink-0 snap-start w-[85vw] sm:w-72 lg:w-80 flex flex-col rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-5 hover:border-white/30 hover:bg-white/[0.04] transition"
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
            </Link>
          ))}
        </CardSlider>
      </div>
    </section>
  )
}
