import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { DollarSign, TrendingDown, Percent, AlertTriangle } from 'lucide-react'
import StatCard from '../components/ui/StatCard'
import NumInput from '../components/ui/NumInput'
import ChartTooltip from '../components/ui/ChartTooltip'
import { useCalculatorInputs } from '../hooks/useCalculatorInputs'
import { fmt } from '../utils/format'

const DEFAULTS = {
  version: 1,
  initial_investment: 10000,
  monthly_contribution: 500,
  annual_return: 7,
  years: 30,
  low_fee: 0.1,
  high_fee: 1.0,
}

function calculateGrowth(principal, monthly, annualReturn, years) {
  const r = annualReturn / 100 / 12
  const n = years * 12
  const fvLump = principal * Math.pow(1 + r, n)
  const fvContrib = r > 0
    ? monthly * ((Math.pow(1 + r, n) - 1) / r)
    : monthly * n
  return fvLump + fvContrib
}

function calculate(inputs) {
  const principal  = parseFloat(inputs.initial_investment) || 0
  const monthly    = parseFloat(inputs.monthly_contribution) || 0
  const baseReturn = parseFloat(inputs.annual_return) || 0
  const years      = parseFloat(inputs.years) || 0
  const lowFee     = parseFloat(inputs.low_fee) || 0
  const highFee    = parseFloat(inputs.high_fee) || 0

  const lowFeeValue  = calculateGrowth(principal, monthly, baseReturn - lowFee, years)
  const highFeeValue = calculateGrowth(principal, monthly, baseReturn - highFee, years)
  const feeCost      = lowFeeValue - highFeeValue
  const feePct       = lowFeeValue > 0 ? (feeCost / lowFeeValue) * 100 : 0

  const chartData = []
  for (let y = 0; y <= years; y++) {
    chartData.push({
      year: y,
      lowFee:  Math.round(calculateGrowth(principal, monthly, baseReturn - lowFee, y)),
      highFee: Math.round(calculateGrowth(principal, monthly, baseReturn - highFee, y)),
    })
  }

  return { lowFeeValue, highFeeValue, feeCost, feePct, chartData }
}

export default function InvestmentFeeCalculator({ initialData, onDataChange }) {
  const { inputs, set } = useCalculatorInputs({
    defaults: DEFAULTS,
    initialData,
    onDataChange,
    calcType: 'investment_fee',
  })
  const results = calculate(inputs)

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Low-Fee Portfolio"
          value={fmt(results.lowFeeValue)}
          sub={`At ${inputs.low_fee}% fee`}
          Icon={TrendingDown}
          iconClass="text-emerald-500"
          gradientClass="from-emerald-500 to-teal-600"
        />
        <StatCard
          label="High-Fee Portfolio"
          value={fmt(results.highFeeValue)}
          sub={`At ${inputs.high_fee}% fee`}
          Icon={TrendingDown}
          iconClass="text-red-500"
          gradientClass="from-red-500 to-rose-600"
        />
        <StatCard
          label="Fee Drag"
          value={fmt(results.feeCost)}
          sub="Total cost of higher fees"
          Icon={AlertTriangle}
          iconClass="text-amber-500"
          gradientClass="from-amber-400 to-orange-500"
        />
        <StatCard
          label="Wealth Lost"
          value={`${results.feePct.toFixed(1)}%`}
          sub="Of low-fee final value"
          Icon={Percent}
          iconClass="text-violet-500"
          gradientClass="from-violet-500 to-purple-600"
        />
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-xl font-bold text-gray-800">Fee Impact Over Time</h3>
          <div className="flex gap-4 text-xs text-gray-400">
            {[
              { color: '#10b981', label: `Low fee (${inputs.low_fee}%)`, dashed: false },
              { color: '#ef4444', label: `High fee (${inputs.high_fee}%)`, dashed: false },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <svg width="16" height="8">
                  <line x1="0" y1="4" x2="16" y2="4" stroke={l.color} strokeWidth="2" />
                </svg>
                {l.label}
              </div>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={results.chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gGreenFee" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gRedFee" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={v => `Yr ${v}`} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} width={54} />
            <Tooltip content={<ChartTooltip fmt={fmt} />} />
            <Area type="monotone" dataKey="highFee" name={`High fee (${inputs.high_fee}%)`} stroke="#ef4444" strokeWidth={2} fill="url(#gRedFee)" dot={false} />
            <Area type="monotone" dataKey="lowFee"  name={`Low fee (${inputs.low_fee}%)`}  stroke="#10b981" strokeWidth={2} fill="url(#gGreenFee)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Portfolio</h3>
          <div className="space-y-4">
            <NumInput label="Initial Investment"    prefix="$" value={inputs.initial_investment}   onChange={set('initial_investment')}   min={0} />
            <NumInput label="Monthly Contribution"  prefix="$" value={inputs.monthly_contribution} onChange={set('monthly_contribution')} min={0} />
            <NumInput label="Expected Annual Return" suffix="%" value={inputs.annual_return}        onChange={set('annual_return')}        min={0} max={30} step={0.1} />
            <NumInput label="Time Horizon"           suffix="yrs" value={inputs.years}              onChange={set('years')}                min={1} max={60} step={1} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Fee Comparison</h3>
          <div className="space-y-4">
            <NumInput label="Low-Cost Fund Fee"  hint="e.g. index fund" suffix="%" value={inputs.low_fee}  onChange={set('low_fee')}  min={0} max={5} step={0.01} />
            <NumInput label="High-Cost Fund Fee" hint="e.g. active fund" suffix="%" value={inputs.high_fee} onChange={set('high_fee')} min={0} max={5} step={0.01} />
          </div>

          <div className="mt-5 bg-gradient-to-r from-red-50 to-amber-50 border border-red-100 rounded-lg p-4">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1">Insight</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              The extra <strong className="text-gray-800">{(parseFloat(inputs.high_fee) - parseFloat(inputs.low_fee)).toFixed(2)}%</strong> fee
              costs you <strong className="text-gray-800">{fmt(results.feeCost)}</strong> over {inputs.years} years —
              that's <strong className="text-gray-800">{results.feePct.toFixed(1)}%</strong> of your potential wealth.
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
