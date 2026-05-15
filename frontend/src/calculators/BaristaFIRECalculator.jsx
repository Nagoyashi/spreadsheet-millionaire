import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { Coffee, TrendingUp, DollarSign, Calendar } from 'lucide-react'
import StatCard from '../components/ui/StatCard'
import NumInput from '../components/ui/NumInput'
import ChartTooltip from '../components/ui/ChartTooltip'
import { useCalculatorInputs } from '../hooks/useCalculatorInputs'
import { fmt } from '../utils/format'

const DEFAULTS = {
  version: 1,
  annual_expenses: 48000,
  part_time_income: 20000,
  current_savings: 100000,
  expected_return: 6,
  withdrawal_rate: 4,
  current_age: 35,
  annual_contribution: 20000,
}

function calculate(inputs) {
  const expenses       = parseFloat(inputs.annual_expenses) || 0
  const partTimeIncome = parseFloat(inputs.part_time_income) || 0
  const savings        = parseFloat(inputs.current_savings) || 0
  const returnRate     = parseFloat(inputs.expected_return) / 100 || 0.06
  const withdrawalRate = parseFloat(inputs.withdrawal_rate) / 100 || 0.04
  const currentAge     = parseFloat(inputs.current_age) || 35
  const contribution   = parseFloat(inputs.annual_contribution) || 0

  // Barista FIRE: portfolio only needs to cover expenses MINUS part-time income
  const portfolioCoverageNeeded = Math.max(0, expenses - partTimeIncome)
  const baristaFIRENumber       = withdrawalRate > 0 ? portfolioCoverageNeeded / withdrawalRate : 0
  const fullFIRENumber          = withdrawalRate > 0 ? expenses / withdrawalRate : 0
  const savingsRequired         = Math.max(0, baristaFIRENumber - savings)

  // Years to Barista FIRE
  let yearsToBarista = 0
  let bal = savings
  while (bal < baristaFIRENumber && yearsToBarista < 100) {
    bal = bal * (1 + returnRate) + contribution
    yearsToBarista++
  }
  if (yearsToBarista >= 100) yearsToBarista = null

  const baristaAge = yearsToBarista != null ? currentAge + yearsToBarista : null

  // Chart
  const chartYears = yearsToBarista != null ? Math.min(yearsToBarista + 10, 50) : 40
  const chartData = []
  bal = savings
  for (let y = 0; y <= chartYears; y++) {
    chartData.push({
      year: currentAge + y,
      portfolio: Math.round(bal),
      baristaTarget: Math.round(baristaFIRENumber),
      fullTarget: Math.round(fullFIRENumber),
    })
    bal = bal * (1 + returnRate) + contribution
  }

  return {
    baristaFIRENumber, fullFIRENumber, portfolioCoverageNeeded,
    savingsRequired, yearsToBarista, baristaAge, chartData,
  }
}

export default function BaristaFIRECalculator({ initialData, onDataChange }) {
  const { inputs, set } = useCalculatorInputs({
    defaults: DEFAULTS,
    initialData,
    onDataChange,
    calcType: 'barista_fire',
  })
  const results = calculate(inputs)

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Barista FIRE Number"
          value={fmt(results.baristaFIRENumber)}
          sub="Portfolio target (semi-retire)"
          Icon={Coffee}
          iconClass="text-amber-500"
          gradientClass="from-amber-400 to-orange-500"
        />
        <StatCard
          label="Full FIRE Number"
          value={fmt(results.fullFIRENumber)}
          sub="Portfolio target (fully retire)"
          Icon={TrendingUp}
          iconClass="text-emerald-500"
          gradientClass="from-emerald-500 to-teal-600"
        />
        <StatCard
          label="Portfolio Covers"
          value={fmt(results.portfolioCoverageNeeded)}
          sub={`Per year after part-time income`}
          Icon={DollarSign}
          iconClass="text-blue-500"
          gradientClass="from-blue-500 to-indigo-600"
        />
        <StatCard
          label="Barista FIRE Age"
          value={results.baristaAge ? `Age ${results.baristaAge}` : '100+'}
          sub={results.yearsToBarista ? `In ${results.yearsToBarista} years` : 'Adjust inputs'}
          Icon={Calendar}
          iconClass="text-violet-500"
          gradientClass="from-violet-500 to-purple-600"
        />
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-xl font-bold text-gray-800">Path to Barista FIRE</h3>
          <div className="flex gap-4 text-xs text-gray-400">
            {[
              { color: '#3b82f6', label: 'Portfolio',         dashed: false },
              { color: '#f59e0b', label: 'Barista FIRE target', dashed: true  },
              { color: '#10b981', label: 'Full FIRE target',   dashed: true  },
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
              <linearGradient id="gBlueBarista" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={v => `Age ${v}`} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} width={54} />
            <Tooltip content={<ChartTooltip fmt={fmt} />} />
            {results.baristaAge && (
              <ReferenceLine x={results.baristaAge} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1.5}
                label={{ value: 'Barista FIRE', position: 'insideTopRight', fontSize: 10, fill: '#f59e0b' }} />
            )}
            <Area type="monotone" dataKey="fullTarget"     name="Full FIRE target"    stroke="#10b981" strokeWidth={1.5} fill="none"              strokeDasharray="6 3" dot={false} />
            <Area type="monotone" dataKey="baristaTarget"  name="Barista FIRE target" stroke="#f59e0b" strokeWidth={1.5} fill="none"              strokeDasharray="5 3" dot={false} />
            <Area type="monotone" dataKey="portfolio"      name="Portfolio"            stroke="#3b82f6" strokeWidth={2}   fill="url(#gBlueBarista)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Your Finances</h3>
          <div className="space-y-4">
            <NumInput label="Annual Expenses"      prefix="$" value={inputs.annual_expenses}     onChange={set('annual_expenses')}     min={0} hint="in semi-retirement" />
            <NumInput label="Part-Time Income"     prefix="$" value={inputs.part_time_income}    onChange={set('part_time_income')}    min={0} hint="per year" />
            <NumInput label="Current Savings"      prefix="$" value={inputs.current_savings}     onChange={set('current_savings')}     min={0} />
            <NumInput label="Annual Contribution"  prefix="$" value={inputs.annual_contribution} onChange={set('annual_contribution')} min={0} hint="until semi-retire" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Assumptions</h3>
          <div className="space-y-4">
            <NumInput label="Current Age"      suffix="yrs" value={inputs.current_age}     onChange={set('current_age')}     min={18} max={70} step={1} />
            <NumInput label="Expected Return"  suffix="%"   value={inputs.expected_return}  onChange={set('expected_return')}  min={0} max={20} step={0.1} />
            <NumInput label="Withdrawal Rate"  suffix="%"   value={inputs.withdrawal_rate}  onChange={set('withdrawal_rate')}  min={0} max={10} step={0.1} />
          </div>

          <div className="mt-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-lg p-4">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">Insight</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Your <strong className="text-gray-800">{fmt(parseFloat(inputs.part_time_income))}/yr</strong> part-time income
              reduces your required portfolio from <strong className="text-gray-800">{fmt(results.fullFIRENumber)}</strong> to{' '}
              <strong className="text-gray-800">{fmt(results.baristaFIRENumber)}</strong> —
              saving you <strong className="text-gray-800">{fmt(results.fullFIRENumber - results.baristaFIRENumber)}</strong> in required savings.
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
