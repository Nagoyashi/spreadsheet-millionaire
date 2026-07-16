import { Link } from 'react-router-dom'
import { Search, ChevronDown, ChevronRight, ArrowRight } from 'lucide-react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import MarketingNav from '../marketing/MarketingNav'
import MarketingFooter from '../marketing/MarketingFooter'
import MarketingPageHero from '../marketing/MarketingPageHero'
import { SuperadminPreviewBanner } from '../marketing/SuperadminPreview'

// /etfs-stocks — the instrument lookup, per the marketing-pages design handoff
// (NEW-PAGES.md § ETFs & Stocks). Superadmin-only draft: routed through
// <SuperadminPreview> in App.jsx; public visitors keep the coming-soon page.
//
// ── Placeholder content — NO real API ───────────────────────────────────────
// The live page is server-driven (search, filters, sort, paging) via the
// planned market-data API. None of that exists yet, so everything below —
// fund names, ISINs, TERs, sizes, performance, the results count, the "Live
// data" indicator — is static, illustrative placeholder data defined locally.
// The search input and filter pills are visual-only until the API lands.

const FILTER_PILLS = [
  'Type: ETF',
  'Region: World',
  'TER: any',
  'Distribution: any',
  'Sort: Fund size',
]

const QUICK_LINKS = [
  { title: 'World ETFs', count: '412 funds' },
  { title: 'US large-cap', count: '38 funds' },
  { title: 'Emerging markets', count: '156 funds' },
  { title: 'Dividend ETFs', count: '94 funds' },
]

const FUNDS = [
  {
    name: 'Global All-Cap Equity ETF',
    isin: 'IE00BX47Q219',
    type: 'Equity',
    ter: '0.12%',
    size: '$92.4B',
    y1: 14.2,
    y5: 71.8,
  },
  {
    name: 'US Large-Cap 500 ETF',
    isin: 'IE00B5BMR087',
    type: 'Equity',
    ter: '0.07%',
    size: '$118.6B',
    y1: 17.9,
    y5: 96.3,
  },
  {
    name: 'World Equity Index ETF',
    isin: 'IE00B4L5Y983',
    type: 'Equity',
    ter: '0.20%',
    size: '$84.1B',
    y1: 13.6,
    y5: 68.4,
  },
  {
    name: 'US Tech 100 ETF',
    isin: 'IE00B53SZB19',
    type: 'Equity',
    ter: '0.30%',
    size: '$62.7B',
    y1: 21.4,
    y5: 128.9,
  },
  {
    name: 'Emerging Markets IMI ETF',
    isin: 'IE00BKM4GZ66',
    type: 'Equity',
    ter: '0.18%',
    size: '$21.9B',
    y1: -2.8,
    y5: 24.1,
  },
  {
    name: 'Global Dividend Leaders ETF',
    isin: 'IE00B9CQXS71',
    type: 'Equity',
    ter: '0.29%',
    size: '$4.2B',
    y1: 8.7,
    y5: 42.6,
  },
  {
    name: 'Euro Government Bond ETF',
    isin: 'LU0290355717',
    type: 'Bond',
    ter: '0.15%',
    size: '$3.8B',
    y1: 3.1,
    y5: -4.9,
  },
]

const TYPE_PILL = {
  Equity: 'bg-blue-50 text-blue-700',
  Bond: 'bg-green-50 text-green-800',
}

const ROW_GRID =
  'grid grid-cols-[2.4fr_0.8fr_0.7fr_0.9fr_0.7fr_0.7fr_0.4fr] gap-3.5 items-center px-6'

// Performance cell: positive emerald with "+", negative rose with a true
// minus sign (U+2212), per the handoff.
function Perf({ value }) {
  const positive = value >= 0
  return (
    <span className={`text-[13.5px] font-bold ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
      {positive ? '+' : '−'}
      {Math.abs(value)}%
    </span>
  )
}

export default function EtfsStocksPage({ auth }) {
  useDocumentTitle('ETFs & Stocks · SpreadsheetMillionaire')

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <MarketingNav auth={auth} />
      <SuperadminPreviewBanner />

      <main className="flex-1">
        <MarketingPageHero
          eyebrow="ETFs & Stocks"
          title="Find any ETF or stock."
          sub="A real-time, categorized lookup across thousands of ETFs and stocks — compare fees, size and performance before you buy."
        >
          {/* Search — visual only pending the market-data API */}
          <div className="mt-8 mx-auto max-w-[640px] relative">
            <Search
              className="w-[18px] h-[18px] text-gray-400 absolute left-4 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Search by name, ISIN or ticker…"
              aria-label="Search by name, ISIN or ticker"
              className="w-full h-[54px] pl-11 pr-4 border border-gray-300 rounded-xl text-[15.5px] text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400 shadow-[0_2px_8px_rgba(17,24,39,0.05)]"
            />
          </div>

          {/* Filter pills — static for now; they become dropdowns with the API */}
          <div className="mt-[18px] flex justify-center gap-2 flex-wrap">
            {FILTER_PILLS.map((label) => (
              <button
                key={label}
                type="button"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 sm:py-[7px] rounded-full bg-white border border-gray-200 text-gray-600 text-[13px] font-medium hover:border-gray-300 hover:text-gray-900 transition"
              >
                {label}
                <ChevronDown className="w-[13px] h-[13px]" />
              </button>
            ))}
          </div>
        </MarketingPageHero>

        {/* Category quick-links — inert until category result pages exist */}
        <section className="max-w-6xl mx-auto px-6 pt-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {QUICK_LINKS.map(({ title, count }) => (
              <div
                key={title}
                className="flex items-center justify-between border border-gray-200 rounded-xl px-5 py-[18px] transition-shadow hover:shadow-[0_6px_18px_-6px_rgba(17,24,39,0.14)]"
              >
                <div>
                  <div className="text-[14.5px] font-bold">{title}</div>
                  <div className="text-[12.5px] text-gray-400">{count}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            ))}
          </div>
        </section>

        {/* Results */}
        <section className="max-w-6xl mx-auto px-6 pt-10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500">
              <span className="font-bold text-gray-900">2,847</span> results
            </span>
            <span className="inline-flex items-center gap-[7px] text-[12.5px] font-semibold text-emerald-600">
              <span className="w-[7px] h-[7px] rounded-full bg-emerald-500" aria-hidden="true" />
              Live data
            </span>
          </div>

          <div className="border border-gray-200 rounded-[14px] overflow-x-auto">
            <div className="min-w-[820px]">
              <div
                className={`${ROW_GRID} py-[13px] bg-gray-50 border-b border-gray-200 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-gray-500`}
              >
                <span>Fund</span>
                <span>Type</span>
                <span>TER</span>
                <span>Fund size</span>
                <span>1Y</span>
                <span>5Y</span>
                <span />
              </div>

              {FUNDS.map((fund, i) => (
                <div
                  key={fund.isin}
                  className={`${ROW_GRID} py-[17px] hover:bg-gray-50 transition ${
                    i < FUNDS.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <div>
                    <div className="text-[14.5px] font-bold">{fund.name}</div>
                    <div className="font-mono text-[11.5px] text-gray-400">{fund.isin}</div>
                  </div>
                  <span
                    className={`justify-self-start text-[11px] font-semibold px-[9px] py-[3px] rounded-full ${TYPE_PILL[fund.type]}`}
                  >
                    {fund.type}
                  </span>
                  <span className="text-[13.5px] font-semibold">{fund.ter}</span>
                  <span className="text-[13.5px] font-semibold">{fund.size}</span>
                  <Perf value={fund.y1} />
                  <Perf value={fund.y5} />
                  <ChevronRight className="w-4 h-4 text-gray-400 justify-self-end" />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between flex-wrap gap-2.5">
            <p className="text-[12.5px] text-gray-400">
              Fund names and figures are illustrative placeholders — the live page pulls real
              instruments via API.
            </p>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-blue-600 hover:text-blue-700 transition"
            >
              Load more results <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        {/* Cross-sell band */}
        <section className="max-w-6xl mx-auto px-6 pt-16 pb-[72px]">
          <div className="bg-gray-50 border border-gray-100 rounded-[14px] px-7 py-8 sm:px-9 flex items-center justify-between gap-8 flex-wrap">
            <div>
              <h3 className="text-[19px] font-bold text-gray-900 mb-1.5">
                Found a fund? Model it.
              </h3>
              <p className="text-sm text-gray-500">
                Take its return and TER into the compound interest or fee-impact calculator and see
                what it does to your plan.
              </p>
            </div>
            <Link
              to="/app"
              className="inline-flex items-center gap-2 min-h-[46px] px-6 rounded-[10px] bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition whitespace-nowrap"
            >
              Open the calculators <ArrowRight className="w-[15px] h-[15px]" />
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter slim />
    </div>
  )
}
