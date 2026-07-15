import { Link } from 'react-router-dom'
import { BookOpen, TrendingUp, Columns2, LineChart } from 'lucide-react'

// "More than calculators" — the four connected site surfaces (Guide /
// Calculators / Comparison / ETFs & Stocks). One live (the app), three with
// Beta coming-soon pages; every status shown is true of the product today
// (DECISIONS.md § "Marketing page invents nothing"). Copy is final per the
// marketing redesign handoff. Coming-soon cards get a dashed border; the live
// card a solid one.

const SURFACES = [
  {
    key: 'guide',
    label: 'Guide',
    Icon: BookOpen,
    live: false,
    to: '/guide',
    blurb:
      'Articles and videos on FIRE, investing and debt — plain-language financial education you can actually act on.',
  },
  {
    key: 'calculators',
    label: 'Calculators',
    Icon: TrendingUp,
    live: true,
    to: '/app',
    blurb:
      'The app: twelve calculators and two trackers, free to use — the planning core of the site.',
  },
  {
    key: 'comparison',
    label: 'Comparison',
    Icon: Columns2,
    live: false,
    to: '/comparison',
    blurb:
      'Side-by-side comparisons of brokers, accounts and savings products — honest recommendations for choosing well.',
  },
  {
    key: 'etfs-stocks',
    label: 'ETFs & Stocks',
    Icon: LineChart,
    live: false,
    to: '/etfs-stocks',
    blurb: 'A real-time, categorized lookup across ETFs and stocks, pulled live from market data.',
  },
]

function SurfaceCard({ label, Icon, live, to, blurb }) {
  return (
    <Link
      to={to}
      className={`flex flex-col rounded-xl bg-white p-[22px] transition duration-150 hover:shadow-[0_8px_24px_-8px_rgba(17,24,39,0.15)] hover:-translate-y-0.5 ${
        live ? 'border border-gray-200' : 'border border-dashed border-gray-300'
      }`}
    >
      <div className="flex items-center justify-between mb-3.5">
        <div
          className={`inline-flex w-10 h-10 items-center justify-center rounded-[10px] ${
            live ? 'bg-blue-50' : 'bg-gray-50'
          }`}
        >
          <Icon className={`w-[19px] h-[19px] ${live ? 'text-blue-600' : 'text-gray-500'}`} />
        </div>
        <span
          className={`text-[11px] font-semibold uppercase tracking-[0.04em] px-2.5 py-[3px] rounded-full ${
            live ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-700'
          }`}
        >
          {live ? 'Live' : 'Coming soon'}
        </span>
      </div>
      <h3 className="text-[15px] font-bold text-gray-900 mb-2">{label}</h3>
      <p className="text-[13.5px] text-gray-500 leading-[1.65]">{blurb}</p>
    </Link>
  )
}

export default function ComingSoonStrip() {
  return (
    <section>
      <div className="max-w-6xl mx-auto px-6 py-20 sm:py-[88px]">
        <div className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-amber-600 mb-3">
            The whole picture
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.02em] text-gray-900">
            More than calculators
          </h2>
          <p className="mt-3.5 text-base leading-relaxed text-gray-500 max-w-[600px] mx-auto">
            SpreadsheetMillionaire is growing into four connected surfaces — learn the concepts,
            plan with your numbers, choose the right products, and look up any instrument. All open
            source.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SURFACES.map((s) => (
            <SurfaceCard key={s.key} {...s} />
          ))}
        </div>
      </div>
    </section>
  )
}
