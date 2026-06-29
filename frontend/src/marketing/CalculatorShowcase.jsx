import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
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

function CalculatorCard({ type, label, subtitle, description, Icon, gradient }) {
  return (
    <Link
      to={`/app/calculator/${type}`}
      className="group flex flex-col h-full rounded-xl border border-white/10 bg-white/[0.03] p-5 hover:border-white/25 hover:bg-white/[0.06] transition"
    >
      <div className={`h-1 w-full rounded-full bg-gradient-to-r ${gradient} mb-4`} />
      <div className={`inline-flex w-11 h-11 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} mb-4`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500 mb-1">{subtitle}</p>
      <h3 className="text-base font-bold text-white mb-2">{label}</h3>
      <p className="text-sm text-stone-400 leading-relaxed flex-1">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-amber-400 group-hover:gap-2 transition-all">
        Open <ArrowRight className="w-4 h-4" />
      </span>
    </Link>
  )
}

export default function CalculatorShowcase() {
  const { publishedCalculators } = usePublishedCalculators()
  return (
    <section id="calculators" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
      <div className="text-center mb-10 sm:mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Calculators you can use right now
        </h2>
        <p className="mt-3 text-sm sm:text-base text-stone-400 max-w-xl mx-auto">
          No signup, no paywall. Click any one and start with your own numbers.
        </p>
      </div>

      <Carousel
        label="Calculators"
        items={publishedCalculators}
        renderItem={(calc) => <CalculatorCard key={calc.type} {...calc} />}
      />
    </section>
  )
}
