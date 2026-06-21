import { useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Camera, TrendingUp, TrendingDown } from 'lucide-react'
import { fmt, fmtPct } from '../../utils/format'

// Net Worth overview dashboard (the Overview tab). Built on recharts (already a
// dependency). Renders the global summary, an asset-allocation pie, a category
// bar (liabilities negative), category cards with % of assets, and a snapshot
// history line chart with a "take snapshot" action.

const money = (n) => fmt(n, { compact: false })
const moneyCompact = (n) => fmt(n, { compact: true })

// Category colours — consistent across pie, bar, and cards.
const COLORS = {
  liquid_assets: '#3b82f6',
  investments: '#10b981',
  real_estate: '#f59e0b',
  collectibles: '#8b5cf6',
  liabilities: '#ef4444',
}

const ASSET_CATEGORIES = [
  { key: 'liquid_assets', label: 'Liquid Assets' },
  { key: 'investments', label: 'Investments' },
  { key: 'real_estate', label: 'Real Estate' },
  { key: 'collectibles', label: 'Collectibles' },
]

function StatCard({ label, value, tone = 'text-gray-800', sub }) {
  return (
    <div>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl sm:text-3xl font-bold ${tone}`}>{value}</p>
      {sub}
    </div>
  )
}

export default function Dashboard({ summary, snapshots, onSnapshot }) {
  const [snapping, setSnapping] = useState(false)

  if (!summary) return null
  const c = summary.categories

  const pctReturn =
    summary.total_cost_basis > 0 ? (summary.lifetime_gain / summary.total_cost_basis) * 100 : null
  const gainPositive = summary.lifetime_gain >= 0

  // Pie: positive asset categories only.
  const allocation = ASSET_CATEGORIES.map((cat) => ({
    ...cat,
    value: c[cat.key].total,
  })).filter((d) => d.value > 0)

  // Bar: asset categories + liabilities as a negative bar.
  const barData = [
    ...ASSET_CATEGORIES.map((cat) => ({ name: cat.label, value: c[cat.key].total, key: cat.key })),
    { name: 'Liabilities', value: -c.liabilities.total, key: 'liabilities' },
  ]

  // Line: net worth over time from snapshots.
  const history = snapshots.map((s) => ({ date: s.snapshot_date, net_worth: s.net_worth }))

  async function handleSnapshot() {
    setSnapping(true)
    await onSnapshot({})
    setSnapping(false)
  }

  return (
    <div className="space-y-6">
      {/* Global summary */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-5">Global Financial Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            label="Net Worth"
            value={money(summary.net_worth)}
            tone={summary.net_worth >= 0 ? 'text-gray-800' : 'text-red-600'}
          />
          <StatCard label="Total Assets" value={money(summary.total_assets)} tone="text-blue-600" />
          <StatCard
            label="Total Liabilities"
            value={money(summary.total_liabilities)}
            tone="text-red-600"
          />
          <StatCard
            label="Lifetime Gain / Loss"
            value={money(summary.lifetime_gain)}
            tone={gainPositive ? 'text-green-600' : 'text-red-600'}
            sub={
              pctReturn != null && (
                <p className="mt-1 flex items-center text-xs text-gray-500">
                  {gainPositive ? (
                    <TrendingUp className="w-3.5 h-3.5 text-green-600 mr-1" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-red-600 mr-1" />
                  )}
                  {fmtPct(pctReturn, { fromPercent: true })} return
                </p>
              )
            }
          />
        </div>
      </div>

      {/* Allocation pie + category bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Asset Allocation</h3>
          {allocation.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-sm text-gray-500">
              No assets yet — add some to see your allocation.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={allocation}
                    dataKey="value"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                  >
                    {allocation.map((entry) => (
                      <Cell key={entry.key} fill={COLORS[entry.key]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => money(value)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1.5">
                {allocation.map((entry) => (
                  <div key={entry.key} className="flex items-center justify-between text-sm">
                    <span className="flex items-center text-gray-700">
                      <span
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: COLORS[entry.key] }}
                      />
                      {entry.label}
                    </span>
                    <span className="text-gray-600 font-medium">
                      {fmtPct((entry.value / summary.total_assets) * 100, { fromPercent: true })}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Category Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData} margin={{ top: 4, right: 4, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                tickFormatter={moneyCompact}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                width={56}
              />
              <Tooltip formatter={(value) => money(Math.abs(value))} />
              <Bar dataKey="value">
                {barData.map((entry) => (
                  <Cell key={entry.key} fill={COLORS[entry.key]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[...ASSET_CATEGORIES, { key: 'liabilities', label: 'Liabilities' }].map((cat) => {
          const total = c[cat.key].total
          const pctOfAssets =
            cat.key !== 'liabilities' && summary.total_assets > 0
              ? (total / summary.total_assets) * 100
              : null
          return (
            <div
              key={cat.key}
              className="bg-white rounded-lg shadow-md p-4 border-l-4"
              style={{ borderColor: COLORS[cat.key] }}
            >
              <p className="text-xs font-semibold text-gray-500 mb-1">{cat.label}</p>
              <p className="text-xl font-bold text-gray-800">{moneyCompact(total)}</p>
              <p className="text-xs text-gray-400 mt-1">
                {c[cat.key].count} {c[cat.key].count === 1 ? 'item' : 'items'}
                {pctOfAssets != null && ` · ${fmtPct(pctOfAssets, { fromPercent: true })}`}
              </p>
            </div>
          )
        })}
      </div>

      {/* Snapshot history */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Net Worth Over Time</h3>
          <button
            onClick={handleSnapshot}
            disabled={snapping}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium disabled:opacity-50"
          >
            <Camera className="w-4 h-4" />
            {snapping ? 'Saving…' : 'Take snapshot'}
          </button>
        </div>
        {history.length === 0 ? (
          <div className="h-[260px] flex items-center justify-center text-sm text-gray-500 text-center px-4">
            No snapshots yet — take one to start tracking your net worth over time.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={history} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b7280' }} />
              <YAxis
                tickFormatter={moneyCompact}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                width={56}
              />
              <Tooltip formatter={(value) => money(value)} labelFormatter={(d) => `Date: ${d}`} />
              <Line
                type="monotone"
                dataKey="net_worth"
                name="Net worth"
                stroke="#4f46e5"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
