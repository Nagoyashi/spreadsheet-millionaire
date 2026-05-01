import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { TrendingDown, DollarSign, Calendar, Percent } from 'lucide-react'
import StatCard from '../components/ui/StatCard'
import NumInput from '../components/ui/NumInput'
import ChartTooltip from '../components/ui/ChartTooltip'
import { useCalculatorInputs } from '../hooks/useCalculatorInputs'
import { fmt } from '../utils/format'

const DEFAULTS = {
  version: 1,
  current_amount: 100000,
  inflation_rate: 2.5,
  years: 20,
  desired_future_amount: 200000,
}

function calculate(inputs) {
  const amount        = parseFloat(inputs.current_amount) || 0
  const inflationRate = parseFloat(inputs.inflation_rate) / 100 || 0
  const years         = parseFloat(inputs.years) || 0
  const futureDesired = parseFloat(inputs.desired_future_amount) || 0

  // What today's amount is worth in the future (purchasing power loss)
  const futureValue   = amount * Math.pow(1 + inflationRate, years)
  // What you need today to have futureDesired in real terms
  const todayNeeded   = futureDesired / Math.pow(1 + inflationRate, years)
  const purchaseLoss  = futureValue - amount
  const realReturn    = inflationRate * 100

  const chartData = []
  for (let y = 0; y <= years; y++) {
    const nominal = amount * Math.pow(1 + inflationRate, y)
    chartData.push({
      year: y,
      nominal: Math.round(nominal),
      real: Math.round(amount), // real value stays flat — that's the point
    })
  }

  return { futureValue, todayNeeded, purchaseLoss, realReturn, chartData }
}

export default function InflationCalculator({ initialData, onDataChange }) {
  const { inputs, set } = useCalculatorInputs({
    defaults: DEFAULTS,
    initialData,
    onDataChange,
    calcType: 'inflation',
  })
  const results = calculate(inputs)

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Future Cost"
          value={fmt(results.futureValue)}
          sub={`Today's ${fmt(parseFloat(inputs.current_amount))} in ${inputs.years}yrs`}
          Icon={TrendingDown}
          iconClass="text-red-500"
          gradientClass="from-red-500 to-rose-600"
        />
        <StatCard
          label="Purchasing Power Lost"
          value={fmt(results.purchaseLoss)}
          sub="Eroded by inflation"
          Icon={DollarSign}
          iconClass="text-amber-500"
          gradientClass="from-amber-400 to-orange-500"
        />
        <StatCard
          label="Today's Equivalent"
          value={fmt(results.todayNeeded)}
          sub={`To have ${fmt(parseFloat(inputs.desired_future_amount))} in real terms`}
          Icon={Calendar}
          iconClass="text-blue-500"
          gradientClass="from-blue-500 to-indigo-600"
        />
        <StatCard
          label="Inflation Rate"
          value={`${parseFloat(inputs.inflation_rate).toFixed(1)}%`}
          sub="Annual rate assumed"
          Icon={Percent}
          iconClass="text-violet-500"
          gradientClass="from-violet-500 to-purple-600"
        />
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-xl font-bold text-gray-800">Nominal vs Real Value</h3>
          <div className="flex gap-4 text-xs text-gray-400">
            {[
              { color: '#ef4444', label: 'Cost of goods (nominal)' },
              { color: '#6b7280', label: 'Real value (purchasing power)' },
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
              <linearGradient id="gRedInfl" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gGrayInfl" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6b7280" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#6b7280" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={v => `Yr ${v}`} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} width={54} />
            <Tooltip content={<ChartTooltip fmt={fmt} />} />
            <Area type="monotone" dataKey="real"    name="Real value"    stroke="#6b7280" strokeWidth={2} fill="url(#gGrayInfl)" strokeDasharray="5 3" dot={false} />
            <Area type="monotone" dataKey="nominal" name="Nominal cost"  stroke="#ef4444" strokeWidth={2} fill="url(#gRedInfl)"  dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Today's Money</h3>
          <div className="space-y-4">
            <NumInput label="Current Amount"      prefix="$" value={inputs.current_amount}         onChange={set('current_amount')}         min={0} />
            <NumInput label="Desired Future Amount" prefix="$" value={inputs.desired_future_amount} onChange={set('desired_future_amount')} min={0} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Assumptions</h3>
          <div className="space-y-4">
            <NumInput label="Inflation Rate" hint="per year" suffix="%" value={inputs.inflation_rate} onChange={set('inflation_rate')} min={0} max={20} step={0.1} />
            <NumInput label="Time Period"    suffix="yrs"               value={inputs.years}           onChange={set('years')}           min={1} max={100} step={1} />
          </div>

          <div className="mt-5 bg-gradient-to-r from-red-50 to-amber-50 border border-red-100 rounded-lg p-4">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1">Insight</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              At <strong className="text-gray-800">{inputs.inflation_rate}%</strong> inflation,
              today's <strong className="text-gray-800">{fmt(parseFloat(inputs.current_amount))}</strong> will
              cost <strong className="text-gray-800">{fmt(results.futureValue)}</strong> in {inputs.years} years.
              Your money needs to grow just to stand still.
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
