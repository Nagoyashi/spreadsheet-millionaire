import { useEffect, useState } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { CALC_MAP } from '../../calculators/registry'
import { adminApi } from '../../api/adminApi'

// Analytics (Screen 2). Signups + the tier funnel come from our DB and always
// render; visitors / sources / per-calculator runs come from GA4 (server-side
// proxy) and show a "connect GA4" empty state until GA4 is configured. Free→Paid
// and the Pro/Elite funnel stages stay disabled until billing is live.

const RANGES = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
]

const fmtNum = (n) => (n == null ? '—' : Number(n).toLocaleString())

function Kpi({ label, value, sub, subColor }) {
  return (
    <div className="bg-white rounded-xl border border-[#e8ebee] px-[18px] py-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.5px] text-[#8b9199]">{label}</div>
      <div className="mt-1 text-[28px] font-bold font-mono leading-none text-[#15181c]">{value}</div>
      {sub && <div className="mt-1.5 text-[12px] font-medium" style={{ color: subColor || '#9aa0a8' }}>{sub}</div>}
    </div>
  )
}

function Card({ title, children, right }) {
  return (
    <div className="bg-white rounded-[14px] border border-[#e8ebee] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-bold text-[#15181c]">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  )
}

// Shown in any GA-sourced card when GA4 isn't configured.
function GAEmpty({ what }) {
  return (
    <div className="h-[180px] grid place-items-center text-center px-4">
      <div>
        <p className="text-[13px] font-semibold text-[#6b7280]">Connect GA4 to see {what}</p>
        <p className="mt-1 text-[12px] text-[#9aa0a8]">
          Set <span className="font-mono">GA4_PROPERTY_ID</span> +{' '}
          <span className="font-mono">GA4_CREDENTIALS_JSON</span> on the backend.
        </p>
      </div>
    </div>
  )
}

function VisitorsChart({ data }) {
  if (!data || data.length === 0) return <GAEmpty what="visitors over time" />
  return (
    <div className="h-[180px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="vis" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f5b829" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#f5b829" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9aa0a8' }} tickLine={false} axisLine={false} />
          <Tooltip />
          <Area type="monotone" dataKey="sessions" stroke="#f5b829" fill="url(#vis)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function RankedBars({ items, labelKey, valueKey, colorOf, empty }) {
  if (!items || items.length === 0) return empty
  const max = Math.max(...items.map((i) => i[valueKey])) || 1
  return (
    <div className="space-y-3">
      {items.map((it, idx) => (
        <div key={idx}>
          <div className="flex justify-between text-[12px] mb-1">
            <span className="font-medium text-[#15181c]">{it[labelKey]}</span>
            <span className="font-mono text-[#6b7280]">{fmtNum(it[valueKey])}</span>
          </div>
          <div className="h-2 rounded-full bg-[#f1f3f5] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${(it[valueKey] / max) * 100}%`, background: colorOf ? colorOf(it) : '#f5b829' }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

const CAT_COLOR = {
  Retirement: '#16a34a',
  Investing: '#2563eb',
  'Debt & Property': '#ef4444',
  Budgeting: '#16a34a',
}

function Funnel({ funnel }) {
  if (!funnel) return null
  const stages = [
    { label: 'Visitors', value: funnel.visitors, disabled: false },
    { label: 'Signups', value: funnel.signups, disabled: false },
    { label: 'Free', value: funnel.free, disabled: false },
    { label: 'Pro', value: funnel.pro, disabled: true },
    { label: 'Elite', value: funnel.elite, disabled: true },
  ]
  const max = Math.max(...stages.map((s) => s.value || 0)) || 1
  return (
    <div className="space-y-2.5">
      {stages.map((s) => (
        <div key={s.label} className="flex items-center gap-3" style={{ opacity: s.disabled ? 0.5 : 1 }}>
          <div className="w-16 text-[12px] font-semibold text-[#6b7280]">{s.label}</div>
          <div className="flex-1 h-7 rounded-md bg-[#f1f3f5] overflow-hidden relative">
            <div
              className="h-full rounded-md"
              style={{
                width: `${((s.value || 0) / max) * 100}%`,
                minWidth: s.value ? '8%' : 0,
                background: s.disabled
                  ? 'repeating-linear-gradient(45deg,#e2e5e9,#e2e5e9 6px,#eef0f2 6px,#eef0f2 12px)'
                  : '#f5b829',
              }}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[11px] text-[#6b7280]">
              {s.disabled ? 'activate after beta' : fmtNum(s.value)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AdminAnalytics() {
  const [range, setRange] = useState('30d')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    setData(null)
    adminApi.getAnalytics(range).then(({ ok, data }) => {
      if (!alive) return
      if (ok) setData(data)
      else setError('Could not load analytics.')
    })
    return () => {
      alive = false
    }
  }, [range])

  const k = data?.kpis
  const topCalcs = data?.top_calculators?.map((t) => ({
    ...t,
    label: CALC_MAP[t.calc_type]?.label || t.calc_type,
    category: CALC_MAP[t.calc_type]?.category,
  }))

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-[-0.5px]">Analytics</h1>
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: data?.configured ? '#16a34a' : '#b0b6bd' }}
            />
            <span className="text-[13px] font-medium text-[#6b7280]">
              {data == null
                ? 'Loading…'
                : data.configured
                  ? 'Connected to Google Analytics 4'
                  : 'Not connected — signups shown from our database'}
            </span>
          </div>
        </div>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="bg-white border border-[#e2e5e9] rounded-[10px] px-3 py-2 text-sm outline-none focus:border-[#f5b829]"
        >
          {RANGES.map((r) => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </select>
      </div>

      {error && <div className="text-sm text-[#ef4444] mb-4">{error}</div>}
      {data?.ga_error && (
        <div className="mb-4 text-[13px] text-[#b8860b] bg-[#fdf3da] border border-[#f1e3b8] rounded-lg px-3 py-2">
          GA4 is configured but unavailable: {data.ga_error}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-[14px] mb-5">
        <Kpi label="Total visitors" value={fmtNum(k?.total_visitors)} sub={k?.total_visitors == null ? 'GA4 not connected' : 'sessions'} />
        <Kpi label="New signups" value={fmtNum(k?.new_signups)} sub="from our database" subColor="#16a34a" />
        <Kpi label="Signup rate" value={k?.signup_rate == null ? '—' : `${k.signup_rate}%`} sub="visitor → account" />
        <Kpi label="Free → Paid" value="—" sub="unlocks after beta" subColor="#e0a712" />
        <Kpi
          label="Revenue · MRR"
          value={k?.revenue == null ? '—' : `$${Number(k.revenue).toLocaleString()}`}
          sub="from tier prices — unlocks after beta"
          subColor="#e0a712"
        />
      </div>

      {/* Row: visitors over time | traffic sources */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-[14px] mb-[14px]">
        <Card title="Visitors over time">
          <VisitorsChart data={data?.visitors_over_time} />
        </Card>
        <Card title="Traffic sources">
          <RankedBars
            items={data?.traffic_sources}
            labelKey="source"
            valueKey="sessions"
            empty={<GAEmpty what="traffic sources" />}
          />
        </Card>
      </div>

      {/* Row: funnel | most-used calculators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px]">
        <Card title="Conversion funnel">
          <Funnel funnel={data?.funnel} />
        </Card>
        <Card title="Most-used calculators">
          <RankedBars
            items={topCalcs}
            labelKey="label"
            valueKey="runs"
            colorOf={(it) => CAT_COLOR[it.category] || '#f5b829'}
            empty={<GAEmpty what="per-calculator runs (needs the calc_run event)" />}
          />
        </Card>
      </div>
    </div>
  )
}
