import {
  Shield,
  TrendingUp,
  PiggyBank,
  Bot,
  CreditCard,
  ArrowRight,
  Check,
  Clock,
} from 'lucide-react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import MarketingNav from '../marketing/MarketingNav'
import MarketingFooter from '../marketing/MarketingFooter'
import MarketingPageHero from '../marketing/MarketingPageHero'
import { SuperadminPreviewBanner } from '../marketing/SuperadminPreview'

// /comparison — affiliate product comparisons with the trust layer front and
// center, per the marketing-pages design handoff (NEW-PAGES.md § Comparison).
// Superadmin-only draft: routed through <SuperadminPreview> in App.jsx; public
// visitors keep the coming-soon page.
//
// ── Placeholder content ─────────────────────────────────────────────────────
// Broker names, ratings, fees and "N compared" counts below are illustrative
// placeholders from the design draft — final tables pull real, dated data.
// "View offer" anchors are affiliate-link placeholders and already carry
// rel="sponsored nofollow", the treatment every real affiliate link keeps.
// Category tiles are inert (no category pages exist yet).

const CATEGORY_TILES = [
  {
    Icon: TrendingUp,
    tint: 'bg-blue-50',
    color: 'text-blue-600',
    title: 'Online brokers',
    count: '6 compared',
  },
  {
    Icon: PiggyBank,
    tint: 'bg-emerald-50',
    color: 'text-emerald-600',
    title: 'Savings accounts',
    count: '8 compared',
  },
  {
    Icon: Bot,
    tint: 'bg-violet-50',
    color: 'text-violet-500',
    title: 'Robo-advisors',
    count: '5 compared',
  },
  {
    Icon: CreditCard,
    tint: 'bg-rose-50',
    color: 'text-rose-500',
    title: 'Credit cards',
    count: '7 compared',
  },
]

const BROKERS = [
  {
    name: 'Alpine Invest',
    tag: 'Best overall',
    rating: 4.8,
    ratingPct: 96,
    savingsPlans: '2,400+ free',
    orderFee: '$1.00',
    custodyFee: '$0',
    topPick: true,
  },
  {
    name: 'Nordbank Zero',
    tag: 'Best for beginners',
    rating: 4.6,
    ratingPct: 92,
    savingsPlans: '1,900+ free',
    orderFee: '$0',
    custodyFee: '$0',
  },
  {
    name: 'Quantum Broker',
    tag: 'Best for active traders',
    rating: 4.3,
    ratingPct: 86,
    savingsPlans: '1,200+ free',
    orderFee: '$0.99',
    custodyFee: '$0',
  },
  {
    name: 'EverTrade',
    tag: 'Best full-service bank',
    rating: 4.0,
    ratingPct: 80,
    savingsPlans: '800+ free',
    orderFee: '$4.90',
    custodyFee: '$1.90/mo',
  },
]

const HOW_WE_RATE = [
  {
    Icon: Check,
    title: 'Real criteria',
    body: 'We open real accounts and test fees, savings-plan selection, execution and support — not marketing pages.',
  },
  {
    Icon: Shield,
    title: 'Independent ranking',
    body: 'Scores are locked before any affiliate deal is considered. A partner link never moves a product up the table.',
  },
  {
    Icon: Clock,
    title: 'Updated monthly',
    body: 'Fees and conditions change. Every table carries its last-checked date, and stale data gets pulled, not left up.',
  },
]

const ROW_GRID = 'grid grid-cols-[2fr_1fr_1.2fr_1fr_1fr_1.3fr] gap-4 items-center px-6'

// Free values ($0) render in emerald per the handoff.
function ValueCell({ value }) {
  return (
    <span
      className={`text-[13.5px] font-semibold ${value === '$0' ? 'text-emerald-600' : 'text-gray-900'}`}
    >
      {value}
    </span>
  )
}

export default function ComparisonPage({ auth }) {
  useDocumentTitle('Comparison · SpreadsheetMillionaire')

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <MarketingNav auth={auth} />
      <SuperadminPreviewBanner />

      <main className="flex-1">
        <MarketingPageHero
          eyebrow="Comparison"
          title="Choose the right products."
          sub="Side-by-side comparisons of brokers, accounts and savings products — tested against real criteria and updated monthly."
        >
          {/* Transparency pill — non-negotiable, stays above the fold. */}
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-50 border border-gray-200 text-[13px] text-gray-500">
            <Shield className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />
            <span>
              Some links are affiliate links. They never change our ranking —{' '}
              <a href="#how-we-rate" className="font-semibold text-blue-600 hover:text-blue-700">
                here&apos;s how we rate
              </a>
              .
            </span>
          </div>
        </MarketingPageHero>

        {/* Category tiles */}
        <section className="max-w-6xl mx-auto px-6 pt-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {CATEGORY_TILES.map(({ Icon, tint, color, title, count }) => (
              <div
                key={title}
                className="flex flex-col border border-gray-200 rounded-xl p-[22px] transition duration-150 hover:shadow-[0_8px_24px_-8px_rgba(17,24,39,0.15)] hover:-translate-y-0.5"
              >
                <div
                  className={`inline-flex w-[42px] h-[42px] items-center justify-center rounded-[10px] mb-3.5 ${tint}`}
                >
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <h3 className="text-[15.5px] font-bold mb-1">{title}</h3>
                <p className="flex-1 text-[13px] text-gray-500 mb-3.5">{count}</p>
                <span className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-blue-600">
                  View comparison <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Brokers comparison table */}
        <section className="max-w-6xl mx-auto px-6 pt-16">
          <div className="flex items-baseline justify-between mb-5 flex-wrap gap-2.5">
            <h2 className="text-[26px] font-bold tracking-[-0.02em] text-gray-900">
              Best online brokers for ETF investors
            </h2>
            <span className="text-xs font-semibold uppercase tracking-[0.04em] px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-500">
              Updated July 2026
            </span>
          </div>

          <div className="border border-gray-200 rounded-[14px] overflow-x-auto">
            <div className="min-w-[860px]">
              <div
                className={`${ROW_GRID} py-3.5 bg-gray-50 border-b border-gray-200 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-gray-500`}
              >
                <span>Broker</span>
                <span>Rating</span>
                <span>ETF savings plans</span>
                <span>Order fee</span>
                <span>Custody fee</span>
                <span />
              </div>

              {BROKERS.map((broker, i) => (
                <div
                  key={broker.name}
                  className={`${ROW_GRID} py-5 ${i < BROKERS.length - 1 ? 'border-b border-gray-100' : ''} ${
                    broker.topPick ? 'bg-[#fffdf5]' : ''
                  }`}
                >
                  {/* Product cell */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[10px] bg-gray-100 border border-gray-200 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-bold text-gray-900">{broker.name}</span>
                        {broker.topPick && (
                          <span className="text-[10.5px] font-bold uppercase tracking-[0.05em] px-2 py-0.5 rounded-full bg-amber-600 text-white whitespace-nowrap">
                            Our pick
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">{broker.tag}</div>
                    </div>
                  </div>

                  {/* Rating cell */}
                  <div>
                    <span className="text-base font-bold text-gray-900">{broker.rating}</span>
                    <span className="text-xs text-gray-400">/5</span>
                    <div className="mt-[5px] h-1 w-16 rounded-full bg-gray-100">
                      <div
                        className={`h-1 rounded-full ${broker.topPick ? 'bg-amber-600' : 'bg-gray-900'}`}
                        style={{ width: `${broker.ratingPct}%` }}
                      />
                    </div>
                  </div>

                  <ValueCell value={broker.savingsPlans} />
                  <ValueCell value={broker.orderFee} />
                  <ValueCell value={broker.custodyFee} />

                  {/* Actions — affiliate-link placeholders, rel="sponsored nofollow" */}
                  <div className="flex items-center gap-3.5 justify-end">
                    <a
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      rel="sponsored nofollow"
                      className={`inline-flex items-center min-h-[40px] px-[18px] rounded-lg text-[13.5px] font-semibold whitespace-nowrap transition ${
                        broker.topPick
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-white border border-gray-300 text-gray-900 hover:border-gray-400'
                      }`}
                    >
                      View offer
                    </a>
                    <span className="text-[13px] font-semibold text-blue-600">Details</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-3.5 text-[12.5px] text-gray-400">
            Broker names shown are placeholders for the design draft. Conditions are examples —
            final tables pull real, dated data.
          </p>
        </section>

        {/* How we rate */}
        <section id="how-we-rate" className="max-w-6xl mx-auto px-6 py-[72px]">
          <div className="text-center mb-10">
            <h2 className="text-[28px] font-bold tracking-[-0.02em] text-gray-900">How we rate</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {HOW_WE_RATE.map(({ Icon, title, body }) => (
              <div key={title} className="border border-gray-200 rounded-xl p-6">
                <div className="inline-flex w-10 h-10 items-center justify-center rounded-[10px] bg-amber-50 mb-3.5">
                  <Icon className="w-[19px] h-[19px] text-amber-600" />
                </div>
                <h3 className="text-[15px] font-bold mb-2">{title}</h3>
                <p className="text-[13.5px] leading-[1.65] text-gray-500">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <MarketingFooter slim />
    </div>
  )
}
