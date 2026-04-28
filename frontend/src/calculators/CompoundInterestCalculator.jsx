import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { TrendingUp, Sparkles, Wallet, Repeat } from 'lucide-react'

const DEFAULTS = {
  principal: 10000,
  monthly_contribution: 500,
  annual_rate: 7,
  years: 20,
  compound_frequency: 12,
}

function calculate(inputs) {
  const P   = parseFloat(inputs.principal) || 0
  const pmt = parseFloat(inputs.monthly_contribution) || 0
  const r   = parseFloat(inputs.annual_rate) / 100 || 0
  const t   = parseFloat(inputs.years) || 0
  const n   = parseInt(inputs.compound_frequency) || 12

  const ratePerPeriod = r / n
  const periods = n * t

  const fvLump = P * Math.pow(1 + ratePerPeriod, periods)
  const periodicContrib = pmt * (n / 12)
  const fvContrib = periodicContrib > 0 && ratePerPeriod > 0
    ? periodicContrib * ((Math.pow(1 + ratePerPeriod, periods) - 1) / ratePerPeriod)
    : periodicContrib * periods

  const totalValue   = fvLump + fvContrib
  const totalContrib = P + pmt * 12 * t
  const totalInterest = totalValue - totalContrib

  const chartData = []
  for (let y = 0; y <= t; y++) {
    const p = n * y
    const lump = P * Math.pow(1 + ratePerPeriod, p)
    const contrib = periodicContrib > 0 && ratePerPeriod > 0
      ? periodicContrib * ((Math.pow(1 + ratePerPeriod, p) - 1) / ratePerPeriod)
      : periodicContrib * p
    chartData.push({ year: y, value: Math.round(lump + contrib), contributions: Math.round(P + pmt * 12 * y) })
  }

  return { totalValue, totalContrib, totalInterest, chartData }
}

function fmt(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

function StatCard({ label, value, sub, Icon, iconClass, gradientClass }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-5 hover:shadow-lg hover:-translate-y-1 transition">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <div className="p-2 rounded-lg bg-gray-50">
          <Icon className={`w-4 h-4 ${iconClass}`} />
        </div>
      </div>
      <p className="text-4xl font-bold text-gray-800">{value}</p>
      {sub && <p className="text-sm text-gray-400 mt-1">{sub}</p>}
      <div className={`h-1 rounded-full bg-gradient-to-r ${gradientClass} mt-4`} />
    </div>
  )
}

function NumInput({ label, prefix, suffix, value, onChange, hint, min, max, step = 'any' }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">
        {label}
        {hint && <span className="ml-1 text-gray-400 font-normal">{hint}</span>}
      </label>
      <div className="flex rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden">
        {prefix && (
          <span className="px-3 py-2 bg-gray-50 text-gray-500 text-sm border-r border-gray-300 flex items-center">
            {prefix}
          </span>
        )}
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          min={min}
          max={max}
          step={step}
          className="flex-1 px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none"
        />
        {suffix && (
          <span className="px-3 py-2 bg-gray-50 text-gray-500 text-sm border-l border-gray-300 flex items-center">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs min-w-36">
      <p className="font-semibold text-gray-700 mb-2">Year {label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex justify-between gap-4 mb-1">
          <span className="text-gray-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-semibold text-gray-800">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function CompoundInterestCalculator({ initialData, onDataChange }) {
  const [inputs, setInputs] = useState({ ...DEFAULTS, ...initialData })

  useEffect(() => {
    if (initialData) setInputs({ ...DEFAULTS, ...initialData })
  }, [initialData])

  useEffect(() => {
    onDataChange?.(inputs)
  }, [inputs, onDataChange])

  const set = key => val => setInputs(prev => ({ ...prev, [key]: val }))
  const results = calculate(inputs)

  const multiplier = results.totalContrib > 0
    ? (results.totalValue / results.totalContrib).toFixed(2)
    : '—'
  const interestPct = results.totalValue > 0
    ? ((results.totalInterest / results.totalValue) * 100).toFixed(1)
    : 0

  return (
    <div className="space-y-6">

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Final Value"
          value={fmt(results.totalValue)}
          sub="At end of period"
          Icon={TrendingUp}
          iconClass="text-amber-500"
          gradientClass="from-amber-400 to-orange-500"
        />
        <StatCard
          label="Interest Earned"
          value={fmt(results.totalInterest)}
          sub={`${interestPct}% of final value`}
          Icon={Sparkles}
          iconClass="text-blue-500"
          gradientClass="from-blue-500 to-indigo-600"
        />
        <StatCard
          label="Total Contributed"
          value={fmt(results.totalContrib)}
          sub="Your money in"
          Icon={Wallet}
          iconClass="text-emerald-500"
          gradientClass="from-emerald-500 to-teal-600"
        />
        <StatCard
          label="Money Multiplier"
          value={`${multiplier}×`}
          sub="Return on investment"
          Icon={Repeat}
          iconClass="text-violet-500"
          gradientClass="from-violet-500 to-purple-600"
        />
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-xl font-bold text-gray-800">Growth Projection</h3>
          <div className="flex gap-4 text-xs text-gray-400">
            {[
              { color: '#f59e0b', label: 'Portfolio value', dashed: false },
              { color: '#10b981', label: 'Contributions',   dashed: true  },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <svg width="16" height="8">
                  {l.dashed
                    ? <line x1="0" y1="4" x2="16" y2="4" stroke={l.color} strokeWidth="1.5" strokeDasharray="4 2" />
                    : <line x1="0" y1="4" x2="16" y2="4" stroke={l.color} strokeWidth="2" />
                  }
                </svg>
                {l.label}
              </div>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={results.chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gAmber" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gGreenCI" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={v => `Yr ${v}`} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} width={54} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="contributions" name="Contributions"   stroke="#10b981" strokeWidth={1.5} fill="url(#gGreenCI)" strokeDasharray="5 3" dot={false} />
            <Area type="monotone" dataKey="value"         name="Portfolio value" stroke="#f59e0b" strokeWidth={2}   fill="url(#gAmber)"   dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Investment</h3>
          <div className="space-y-4">
            <NumInput label="Initial Amount"       prefix="$" value={inputs.principal}            onChange={set('principal')}            min={0} />
            <NumInput label="Monthly Contribution" prefix="$" value={inputs.monthly_contribution} onChange={set('monthly_contribution')} min={0} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Growth assumptions</h3>
          <div className="space-y-4">
            <NumInput label="Annual Interest Rate" hint="per year" suffix="%" value={inputs.annual_rate} onChange={set('annual_rate')} min={0} max={50} step={0.1} />
            <NumInput label="Time Period" suffix="yrs" value={inputs.years} onChange={set('years')} min={1} max={100} step={1} />

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Compounding Frequency</label>
              <select
                value={inputs.compound_frequency}
                onChange={e => set('compound_frequency')(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm text-gray-800"
              >
                <option value={1}>Annually</option>
                <option value={4}>Quarterly</option>
                <option value={12}>Monthly</option>
                <option value={365}>Daily</option>
              </select>
            </div>
          </div>

          {/* Insight */}
          <div className="mt-5 bg-gradient-to-r from-amber-50 to-blue-50 border border-amber-100 rounded-lg p-4">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">Insight</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              {results.totalContrib > 0 ? (
                <>
                  Interest accounts for <strong className="text-gray-800">{interestPct}%</strong> of your
                  final <strong className="text-gray-800">{fmt(results.totalValue)}</strong> —
                  that's <strong className="text-gray-800">{fmt(results.totalInterest)}</strong> working for you.
                </>
              ) : (
                <>Enter an amount to see your growth projection.</>
              )}
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
