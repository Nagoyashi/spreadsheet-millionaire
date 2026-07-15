import { Link } from 'react-router-dom'
import { ArrowRight, Wallet, ArrowRightLeft } from 'lucide-react'
import { usePublishedCalculators } from '../calculators/usePublished'
import Carousel from './Carousel'

// One card per published calculator, driven by the runtime published set
// (usePublishedCalculators) merged with registry metadata — label, subtitle,
// description, gradient, and Icon all come from the registry. This list is never
// duplicated or re-filtered here; publishing a calculator (admin toggle) adds its
// card automatically. See PROJECT_STRUCTURE.md § "Registry entry shape".
//
// Each card links DIRECTLY to /app/calculator/:type, not to a signup wall — the
// whole pitch is that the calculators work without an account, so the landing
// page lets a visitor prove that to themselves in one click. A paginated
// Carousel keeps a full page of cards visible (no cut-off) as more are added.
// Below the carousel: the two live trackers, then a "see all" link into the app.

// Light icon-tile tint per color family, keyed by the registry's `color` class
// so the mapping derives from the single source (a color-family lookup, not a
// second calculator list). Tailwind needs the class names written out
// statically, hence the map instead of string surgery.
const TILE_TINTS = {
  'text-emerald-500': 'bg-emerald-50',
  'text-blue-500': 'bg-blue-50',
  'text-violet-500': 'bg-violet-50',
  'text-red-500': 'bg-red-50',
  'text-orange-500': 'bg-orange-50',
  'text-teal-500': 'bg-teal-50',
  'text-indigo-500': 'bg-indigo-50',
  'text-rose-500': 'bg-rose-50',
  'text-sky-500': 'bg-sky-50',
  'text-cyan-500': 'bg-cyan-50',
  'text-green-500': 'bg-green-50',
  'text-amber-500': 'bg-amber-50',
}

function CalculatorCard({ type, label, subtitle, description, Icon, gradient, color }) {
  return (
    <Link
      to={`/app/calculator/${type}`}
      className="group flex flex-col h-full rounded-xl border border-gray-200 bg-white p-[22px] transition duration-150 hover:shadow-[0_8px_24px_-8px_rgba(17,24,39,0.15)] hover:-translate-y-0.5"
    >
      <div className={`h-1 w-full rounded-full bg-gradient-to-r ${gradient} mb-[18px]`} />
      <div
        className={`inline-flex w-[42px] h-[42px] items-center justify-center rounded-[10px] ${TILE_TINTS[color] || 'bg-gray-50'} mb-4`}
      >
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-gray-400 mb-1">
        {subtitle}
      </p>
      <h3 className="text-base font-bold text-gray-900 mb-2">{label}</h3>
      <p className="text-[13.5px] text-gray-500 leading-[1.6] flex-1">{description}</p>
      <span className="mt-[18px] inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-blue-600 group-hover:gap-2.5 transition-all">
        Open <ArrowRight className="w-3.5 h-3.5" />
      </span>
    </Link>
  )
}

// The two live trackers, shown as wide cards under the calculator carousel.
const TRACKER_CARDS = [
  {
    to: '/app/net-worth',
    Icon: Wallet,
    title: 'Net Worth Tracker',
    description: 'Track everything you own and owe, and watch your net worth trend over time.',
  },
  {
    to: '/app/income-expenses',
    Icon: ArrowRightLeft,
    title: 'Income & Expense Tracker',
    description:
      'Log income and spending with a monthly bookkeeping grid, and see where your money actually goes.',
  },
]

function TrackerCard({ to, Icon, title, description }) {
  return (
    <Link
      to={to}
      className="flex gap-4 items-start rounded-xl border border-gray-200 bg-white p-[22px] transition duration-150 hover:shadow-[0_8px_24px_-8px_rgba(17,24,39,0.15)] hover:-translate-y-0.5"
    >
      <div className="inline-flex flex-none w-[42px] h-[42px] items-center justify-center rounded-[10px] bg-indigo-50">
        <Icon className="w-5 h-5 text-indigo-600" />
      </div>
      <div>
        <div className="flex items-center gap-2.5 mb-1.5">
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] px-[9px] py-[3px] rounded-full bg-indigo-50 text-indigo-700 whitespace-nowrap">
            Tracker · Live
          </span>
        </div>
        <p className="text-[13.5px] text-gray-500 leading-[1.6]">{description}</p>
      </div>
    </Link>
  )
}

export default function CalculatorShowcase() {
  const { publishedCalculators } = usePublishedCalculators()
  return (
    <section id="calculators" className="border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-6 py-20 sm:py-[88px]">
        <div className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-amber-600 mb-3">
            Calculators
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.02em] text-gray-900">
            Start with the question you're asking
          </h2>
          <p className="mt-3.5 text-base leading-relaxed text-gray-500 max-w-[520px] mx-auto">
            All twelve calculators are live — free, no account needed. Pick one and run your own
            numbers.
          </p>
        </div>

        <Carousel
          label="Calculators"
          items={publishedCalculators}
          renderItem={(calc) => <CalculatorCard key={calc.type} {...calc} />}
        />

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {TRACKER_CARDS.map((t) => (
            <TrackerCard key={t.to} {...t} />
          ))}
        </div>

        <div className="mt-7 text-center">
          <Link
            to="/app"
            className="inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-blue-600 hover:text-blue-700 transition"
          >
            See all 12 calculators in the app <ArrowRight className="w-[15px] h-[15px]" />
          </Link>
        </div>
      </div>
    </section>
  )
}
