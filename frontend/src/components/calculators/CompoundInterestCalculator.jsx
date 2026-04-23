import { useState, useEffect } from 'react'

const DEFAULTS = {
  principal: 10000,
  monthly_contribution: 500,
  annual_rate: 7,
  years: 20,
  compound_frequency: 12, // monthly
}

function calculate(inputs) {
  const P  = parseFloat(inputs.principal) || 0
  const pmt = parseFloat(inputs.monthly_contribution) || 0
  const r   = parseFloat(inputs.annual_rate) / 100 || 0
  const t   = parseFloat(inputs.years) || 0
  const n   = parseInt(inputs.compound_frequency) || 12

  const ratePerPeriod = r / n
  const periods = n * t

  // Future value of lump sum
  const fvLump = P * Math.pow(1 + ratePerPeriod, periods)

  // Future value of periodic contributions (end of period)
  const periodicContrib = pmt * (n / 12) // scale monthly PMT to period PMT
  const fvContrib = periodicContrib > 0 && ratePerPeriod > 0
    ? periodicContrib * ((Math.pow(1 + ratePerPeriod, periods) - 1) / ratePerPeriod)
    : periodicContrib * periods

  const totalValue      = fvLump + fvContrib
  const totalContrib    = P + pmt * 12 * t
  const totalInterest   = totalValue - totalContrib

  // Build year-by-year data for the visual
  const chartData = []
  for (let y = 0; y <= t; y++) {
    const p = n * y
    const lump = P * Math.pow(1 + ratePerPeriod, p)
    const contrib = periodicContrib > 0 && ratePerPeriod > 0
      ? periodicContrib * ((Math.pow(1 + ratePerPeriod, p) - 1) / ratePerPeriod)
      : periodicContrib * p
    chartData.push({
      year: y,
      value: lump + contrib,
      contributions: P + pmt * 12 * y,
    })
  }

  return { totalValue, totalContrib, totalInterest, chartData }
}

function fmt(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

function InputRow({ label, hint, prefix, suffix, value, onChange, min, max, step = 'any' }) {
  return (
    <div>
      <label className="font-mono text-xs text-stone-500 uppercase tracking-widest block mb-1.5">
        {label}
        {hint && <span className="ml-2 text-stone-600 normal-case font-body">{hint}</span>}
      </label>
      <div className="flex items-center border border-stone-700 focus-within:border-amber-400 transition-colors bg-stone-900">
        {prefix && <span className="font-mono text-sm text-stone-500 px-3 border-r border-stone-700">{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          min={min}
          max={max}
          step={step}
          className="flex-1 bg-transparent text-stone-100 font-mono text-sm px-3 py-2.5 focus:outline-none"
        />
        {suffix && <span className="font-mono text-sm text-stone-500 px-3 border-l border-stone-700">{suffix}</span>}
      </div>
    </div>
  )
}

// Minimal SVG area chart — no charting library needed for this one
function GrowthChart({ data }) {
  if (data.length < 2) return null

  const W = 600
  const H = 160
  const PAD = { top: 8, right: 8, bottom: 24, left: 48 }

  const maxVal = Math.max(...data.map(d => d.value))
  const minVal = 0

  const xScale = (i) => PAD.left + (i / (data.length - 1)) * (W - PAD.left - PAD.right)
  const yScale = (v) => PAD.top + (1 - (v - minVal) / (maxVal - minVal || 1)) * (H - PAD.top - PAD.bottom)

  const valuePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(d.value)}`).join(' ')
  const contribPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(d.contributions)}`).join(' ')

  // Fill area under value line
  const fillPath = `${valuePath} L${xScale(data.length - 1)},${yScale(0)} L${xScale(0)},${yScale(0)} Z`

  // X-axis labels: first, middle, last
  const xLabels = [0, Math.floor((data.length - 1) / 2), data.length - 1]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75, 1].map(f => (
        <line
          key={f}
          x1={PAD.left} y1={yScale(maxVal * f)}
          x2={W - PAD.right} y2={yScale(maxVal * f)}
          stroke="#292524" strokeWidth="1"
        />
      ))}
      {/* Area fill */}
      <path d={fillPath} fill="url(#areaGrad)" />
      {/* Contributions line */}
      <path d={contribPath} fill="none" stroke="#57534e" strokeWidth="1.5" strokeDasharray="4 3" />
      {/* Value line */}
      <path d={valuePath} fill="none" stroke="#fbbf24" strokeWidth="2" />
      {/* Y-axis labels */}
      {[0, 0.5, 1].map(f => (
        <text
          key={f}
          x={PAD.left - 6}
          y={yScale(maxVal * f) + 4}
          textAnchor="end"
          fill="#57534e"
          fontSize="9"
          fontFamily="DM Mono, monospace"
        >
          {fmt(maxVal * f)}
        </text>
      ))}
      {/* X-axis labels */}
      {xLabels.map(i => (
        <text
          key={i}
          x={xScale(i)}
          y={H - 4}
          textAnchor="middle"
          fill="#57534e"
          fontSize="9"
          fontFamily="DM Mono, monospace"
        >
          Yr {data[i].year}
        </text>
      ))}
    </svg>
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

  function set(key) {
    return (val) => setInputs(prev => ({ ...prev, [key]: val }))
  }

  const results = calculate(inputs)

  const multiplier = results.totalContrib > 0
    ? (results.totalValue / results.totalContrib).toFixed(2)
    : '—'

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-8">
        <p className="font-mono text-xs text-amber-400 uppercase tracking-widest mb-1">Calculator</p>
        <h2 className="font-display text-3xl text-stone-100">Compound Interest</h2>
        <p className="font-body text-sm text-stone-500 mt-1">The eighth wonder of the world</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <InputRow label="Initial Amount" prefix="$" value={inputs.principal} onChange={set('principal')} min={0} />
        <InputRow label="Monthly Contribution" prefix="$" value={inputs.monthly_contribution} onChange={set('monthly_contribution')} min={0} />
        <InputRow label="Annual Interest Rate" suffix="%" value={inputs.annual_rate} onChange={set('annual_rate')} min={0} max={50} step={0.1} />
        <InputRow label="Time Period" suffix="yrs" value={inputs.years} onChange={set('years')} min={1} max={100} step={1} />
        <div>
          <label className="font-mono text-xs text-stone-500 uppercase tracking-widest block mb-1.5">
            Compounding Frequency
          </label>
          <select
            value={inputs.compound_frequency}
            onChange={e => set('compound_frequency')(e.target.value)}
            className="w-full bg-stone-900 border border-stone-700 text-stone-100 font-mono text-sm px-3 py-2.5 focus:outline-none focus:border-amber-400 transition-colors"
          >
            <option value={1}>Annually</option>
            <option value={4}>Quarterly</option>
            <option value={12}>Monthly</option>
            <option value={365}>Daily</option>
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="border border-amber-400/40 bg-amber-400/5 p-4 col-span-2 sm:col-span-1">
          <p className="font-mono text-xs text-stone-500 uppercase tracking-widest mb-1">Final Value</p>
          <p className="font-display text-3xl text-amber-400">{fmt(results.totalValue)}</p>
        </div>
        <div className="border border-stone-800 bg-stone-900/50 p-4 col-span-2 sm:col-span-1">
          <p className="font-mono text-xs text-stone-500 uppercase tracking-widest mb-1">Interest Earned</p>
          <p className="font-display text-3xl text-stone-100">{fmt(results.totalInterest)}</p>
        </div>
        <div className="border border-stone-800 bg-stone-900/50 p-4">
          <p className="font-mono text-xs text-stone-500 uppercase tracking-widest mb-1">Total Contributed</p>
          <p className="font-display text-2xl text-stone-100">{fmt(results.totalContrib)}</p>
        </div>
        <div className="border border-stone-800 bg-stone-900/50 p-4">
          <p className="font-mono text-xs text-stone-500 uppercase tracking-widest mb-1">Money Multiplier</p>
          <p className="font-display text-2xl text-stone-100">{multiplier}×</p>
        </div>
      </div>

      {/* Chart */}
      <div className="border border-stone-800 bg-stone-900/30 p-4">
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-amber-400" />
            <span className="font-mono text-xs text-stone-500">Total value</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-stone-600 border-dashed border-t" />
            <span className="font-mono text-xs text-stone-500">Contributions</span>
          </div>
        </div>
        <GrowthChart data={results.chartData} />
      </div>
    </div>
  )
}
