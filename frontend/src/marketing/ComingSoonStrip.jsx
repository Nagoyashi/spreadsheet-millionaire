import { Link } from 'react-router-dom'
import { BookOpen, Scale, LineChart } from 'lucide-react'
import { CALCULATORS } from '../calculators/registry'
import { usePublishedTypes } from '../calculators/usePublished'
import { UPCOMING_FEATURES } from '../upcomingFeatures'
import Carousel from './Carousel'

// The whole roadmap, as a paginated carousel. Three sources:
//   - upcoming trackers (UPCOMING_FEATURES — same single source the in-app
//     teasers use; never duplicated),
//   - the not-yet-published calculators (everything in the registry that the
//     runtime publish set doesn't include — they re-enable one at a time), and
//   - the upcoming marketing sections (Guide / Comparison / ETFs & Stocks),
//     each with a Beta "coming soon" page.
// Items with a `to` are links (their coming-soon page); the rest are static.

const MARKETING_SOON = [
  { key: 'guide', label: 'Guide', Icon: BookOpen, blurb: 'In-depth guides and articles on FIRE, investing, debt, and building wealth.', eta: 'Planned', to: '/guide' },
  { key: 'comparison', label: 'Comparison', Icon: Scale, blurb: 'Side-by-side comparisons of brokers, accounts, and savings products.', eta: 'Planned', to: '/comparison' },
  { key: 'etfs-stocks', label: 'ETFs & Stocks', Icon: LineChart, blurb: 'A real-time, categorized search across ETFs and stocks.', eta: 'Planned', to: '/etfs-stocks' },
]

function ComingCard({ Icon, label, blurb, eta, to }) {
  const className =
    'group flex flex-col h-full rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-5 ' +
    (to ? 'hover:border-white/30 hover:bg-white/[0.04] transition' : '')
  const inner = (
    <>
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
    </>
  )
  return to ? (
    <Link to={to} className={className}>{inner}</Link>
  ) : (
    <div className={className}>{inner}</div>
  )
}

export default function ComingSoonStrip() {
  const published = new Set(usePublishedTypes())

  const trackers = UPCOMING_FEATURES.map((f) => ({
    key: f.slug,
    label: f.label,
    Icon: f.Icon,
    blurb: f.blurb,
    eta: f.eta,
    to: `/app/coming-soon/${f.slug}`,
  }))

  const upcomingCalculators = CALCULATORS.filter((c) => !published.has(c.type)).map((c) => ({
    key: `calc-${c.type}`,
    label: c.label,
    Icon: c.Icon,
    blurb: c.description,
    eta: 'Planned',
  }))

  const items = [...trackers, ...MARKETING_SOON, ...upcomingCalculators]

  return (
    <section className="border-y border-white/10 bg-white/[0.02]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            More on the way
          </h2>
          <p className="mt-3 text-sm sm:text-base text-stone-400 max-w-xl mx-auto">
            Trackers, more calculators, guides, comparisons, and a stock & ETF search — and the whole project is open source.
          </p>
        </div>

        <Carousel
          label="Upcoming features"
          items={items}
          renderItem={(item) => <ComingCard key={item.key} {...item} />}
        />
      </div>
    </section>
  )
}
