import { useEffect, useRef, useState } from 'react'
import { TrendingUp, Wallet, ArrowRightLeft } from 'lucide-react'

// Interactive miniature of the real app, shown under the hero copy. Live DOM,
// not a screenshot: three switchable views (Compound Interest calculator, Net
// Worth tracker, Income & Expense tracker) driven by plain local state, with
// static illustrative numbers and inline-SVG charts (path data from the design
// handoff prototype).
//
// The card is laid out at a fixed 1060×420 and scaled down as a whole below
// ~1108px viewports (scale = min(1, containerWidth / 1060), origin top center,
// measured via ResizeObserver) instead of reflowing — the point is to look
// exactly like the app at any width.

const BASE_W = 1060
const BASE_H = 420

const VIEWS = [
  { key: 'calc', label: 'Calculators', Icon: TrendingUp },
  { key: 'net', label: 'Net worth', Icon: Wallet },
  { key: 'inc', label: 'Income & expenses', Icon: ArrowRightLeft },
]

const HEADERS = {
  calc: { title: 'Compound Interest', badge: 'Investing', badgeClass: 'bg-blue-100 text-blue-800' },
  net: { title: 'Net Worth', badge: 'Tracker', badgeClass: 'bg-indigo-50 text-indigo-700' },
  inc: { title: 'Income & Expenses', badge: 'Tracker', badgeClass: 'bg-indigo-50 text-indigo-700' },
}

function useContainerScale(ref) {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const measure = () => {
      const next = Math.min(1, el.clientWidth / BASE_W)
      // Ignore sub-half-percent jitter so the observer can't ping-pong.
      setScale((s) => (Math.abs(next - s) > 0.005 ? next : s))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return scale
}

function Stat({ label, value, valueClass = 'text-gray-900', labelClass = '' }) {
  return (
    <div>
      <div className={`text-[11px] font-semibold text-gray-500 ${labelClass}`}>{label}</div>
      <div className={`text-2xl font-bold tracking-[-0.02em] whitespace-nowrap ${valueClass}`}>
        {value}
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  labelClass = 'text-gray-600',
  valueClass = 'font-semibold text-gray-900',
}) {
  return (
    <div className="flex justify-between text-[13px]">
      <span className={labelClass}>{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  )
}

function XLabels({ labels, className = '' }) {
  return (
    <div className={`flex justify-between text-[11px] text-gray-400 mt-1.5 ${className}`}>
      {labels.map((l) => (
        <span key={l}>{l}</span>
      ))}
    </div>
  )
}

function GridLines() {
  return (
    <>
      <line x1="0" y1="52" x2="640" y2="52" stroke="#f3f4f6" strokeWidth="1" />
      <line x1="0" y1="104" x2="640" y2="104" stroke="#f3f4f6" strokeWidth="1" />
      <line x1="0" y1="156" x2="640" y2="156" stroke="#f3f4f6" strokeWidth="1" />
    </>
  )
}

function CompoundView() {
  return (
    <div className="grid grid-cols-[280px_1fr] gap-4">
      <div className="bg-white border border-gray-200 rounded-[10px] p-4 flex flex-col gap-[13px]">
        {[
          ['Initial investment', '$10,000'],
          ['Monthly contribution', '$500'],
          ['Annual return', '7.0%'],
          ['Time horizon', '30 years'],
        ].map(([label, value]) => (
          <div key={label}>
            <div className="text-[11px] font-semibold text-gray-500 mb-[5px]">{label}</div>
            <div className="border border-gray-200 rounded-[7px] px-[11px] py-[7px] text-[13px] font-semibold text-gray-900">
              {value}
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white border border-gray-200 rounded-[10px] px-[18px] py-4">
        <div className="flex gap-8 mb-3">
          <Stat label="Final balance" value="$641,200" />
          <Stat label="Total contributions" value="$190,000" valueClass="text-blue-600" />
        </div>
        <svg viewBox="0 0 640 210" className="block w-full h-auto" aria-hidden="true">
          <defs>
            <linearGradient id="hpCompArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <GridLines />
          <path
            d="M0 196 C110 192 200 184 290 168 C380 152 460 120 530 84 C580 58 615 38 640 24 L640 210 L0 210 Z"
            fill="url(#hpCompArea)"
          />
          <path
            d="M0 196 C110 192 200 184 290 168 C380 152 460 120 530 84 C580 58 615 38 640 24"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2.5"
          />
          <circle cx="600" cy="46" r="4" fill="#3b82f6" />
        </svg>
        <XLabels labels={['2026', '2041', '2056']} />
      </div>
    </div>
  )
}

function NetWorthView() {
  return (
    <div className="grid grid-cols-[280px_1fr] gap-4">
      <div className="bg-white border border-gray-200 rounded-[10px] p-4">
        <div className="text-[11px] font-semibold text-gray-500 mb-3">Accounts</div>
        <div className="flex flex-col gap-[11px]">
          <Row label="Brokerage" value="$184,200" />
          <Row label="Home equity" value="$96,300" />
          <Row label="Cash" value="$62,400" />
          <Row label="Student loan" value="−$56,500" valueClass="font-semibold text-rose-600" />
        </div>
        <div className="border-t border-gray-100 mt-[13px] pt-3">
          <Row
            label="Net worth"
            value="$286,400"
            labelClass="font-semibold text-gray-900"
            valueClass="font-bold text-gray-900"
          />
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-[10px] px-[18px] py-4">
        <div className="flex gap-8 mb-3">
          <Stat label="Net worth" value="$286,400" />
          <Stat label="This month" value="+$4,120" valueClass="text-emerald-600" />
        </div>
        <svg viewBox="0 0 640 210" className="block w-full h-auto" aria-hidden="true">
          <defs>
            <linearGradient id="hpNwArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>
          <GridLines />
          <path
            d="M0 180 C60 176 120 168 180 160 C240 152 300 158 360 138 C420 118 480 116 540 92 C580 76 615 66 640 58 L640 210 L0 210 Z"
            fill="url(#hpNwArea)"
          />
          <path
            d="M0 180 C60 176 120 168 180 160 C240 152 300 158 360 138 C420 118 480 116 540 92 C580 76 615 66 640 58"
            fill="none"
            stroke="#6366f1"
            strokeWidth="2.5"
          />
          <circle cx="640" cy="58" r="4" fill="#6366f1" />
        </svg>
        <XLabels labels={['2024', '2025', '2026']} />
      </div>
    </div>
  )
}

// Grouped bars, Jan–Jun: [income x/height, expense x/height] per month.
const INC_BARS = [
  [30, 76, 64, 118],
  [130, 84, 164, 104],
  [230, 64, 264, 124],
  [330, 78, 364, 98],
  [430, 70, 464, 112],
  [530, 56, 564, 116],
]

function IncomeExpenseView() {
  return (
    <div className="grid grid-cols-[280px_1fr] gap-4">
      <div className="bg-white border border-gray-200 rounded-[10px] p-4">
        <div className="text-[11px] font-semibold text-gray-500 mb-3">June 2026</div>
        <div className="flex flex-col gap-[11px]">
          <Row label="Income" value="$6,400" valueClass="font-semibold text-emerald-600" />
          <Row label="Expenses" value="$4,150" valueClass="font-semibold text-rose-600" />
          <Row
            label="Net"
            value="+$2,250"
            labelClass="font-semibold text-gray-900"
            valueClass="font-bold text-emerald-600"
          />
        </div>
        <div className="border-t border-gray-100 mt-[13px] pt-3">
          <div className="text-[11px] font-semibold text-gray-500 mb-2.5">Top categories</div>
          <div className="flex flex-col gap-[9px]">
            <Row label="Housing" value="$1,450" />
            <Row label="Groceries" value="$620" />
            <Row label="Transport" value="$310" />
          </div>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-[10px] px-[18px] py-4">
        <div className="flex gap-8 mb-3">
          <Stat label="Net this month" value="+$2,250" valueClass="text-emerald-600" />
          <Stat label="Avg savings" value="$1,980" labelClass="whitespace-nowrap" />
        </div>
        <svg viewBox="0 0 640 210" className="block w-full h-auto" aria-hidden="true">
          <line x1="0" y1="196" x2="640" y2="196" stroke="#e5e7eb" strokeWidth="1" />
          {INC_BARS.map(([ix, iy, ex, ey]) => (
            <g key={ix}>
              <rect
                x={ix}
                y={iy}
                width="26"
                height={196 - iy}
                rx="3"
                fill="#10b981"
                opacity="0.85"
              />
              <rect
                x={ex}
                y={ey}
                width="26"
                height={196 - ey}
                rx="3"
                fill="#f43f5e"
                opacity="0.7"
              />
            </g>
          ))}
        </svg>
        <XLabels labels={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']} className="px-6" />
      </div>
    </div>
  )
}

const VIEW_BODIES = { calc: CompoundView, net: NetWorthView, inc: IncomeExpenseView }

export default function HeroAppPreview() {
  const wrapRef = useRef(null)
  const scale = useContainerScale(wrapRef)
  const [view, setView] = useState('calc')

  const header = HEADERS[view]
  const Body = VIEW_BODIES[view]

  return (
    <div className="max-w-6xl mx-auto px-6 pt-14 pb-10">
      <div
        ref={wrapRef}
        className="flex justify-center"
        style={{ height: Math.round(BASE_H * scale) }}
      >
        <div
          className="rounded-xl shadow-[0_24px_60px_-12px_rgba(17,24,39,0.25)]"
          style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
        >
          <div
            aria-label="Preview of the SpreadsheetMillionaire app"
            className="w-[1060px] h-[420px] bg-white border border-gray-200 rounded-xl overflow-hidden text-left"
          >
            <div className="flex w-full h-full bg-gray-50">
              {/* Sidebar */}
              <div className="w-[216px] flex-none bg-white border-r border-gray-200 px-3 py-[18px] flex flex-col gap-0.5">
                <div className="px-2.5 pb-4 text-sm font-bold tracking-[-0.01em] text-gray-900">
                  Spreadsheet<span className="text-amber-600">Millionaire</span>
                </div>
                {VIEWS.map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setView(key)}
                    className={`flex items-center gap-[9px] px-2.5 py-2 rounded-lg text-[13px] cursor-pointer select-none text-left ${
                      view === key ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-500'
                    }`}
                  >
                    <Icon className="w-[15px] h-[15px]" aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Main area */}
              <div className="flex-1 px-[26px] py-[22px] overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg font-bold text-gray-900">{header.title}</span>
                    <span
                      className={`text-[11px] font-semibold px-[9px] py-[3px] rounded-full whitespace-nowrap ${header.badgeClass}`}
                    >
                      {header.badge}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">Autosaved</span>
                </div>
                <Body />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
