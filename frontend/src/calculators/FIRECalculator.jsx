import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { Flame, TrendingUp, PiggyBank, Percent } from 'lucide-react'
import StatCard from '../components/ui/StatCard'
import NumInput from '../components/ui/NumInput'
import ChartTooltip from '../components/ui/ChartTooltip'
import { useCalculatorInputs } from '../hooks/useCalculatorInputs'
import { fmt, finiteOr } from '../utils/format'

const MONEY_MAX = 1_000_000_000 // $1B — beyond any real personal-finance figure

const DEFAULTS = {
  version: 1,
  annual_expenses: 40000,
  savings_rate: 50,
  current_savings: 0,
  annual_income: 80000,
  expected_return: 7,
  withdrawal_rate: 4,
}

export function calculate(inputs) {
  const annualExpenses  = parseFloat(inputs.annual_expenses) || 0
  const savingsRate     = parseFloat(inputs.savings_rate) / 100 || 0
  const currentSavings  = parseFloat(inputs.current_savings) || 0
  const annualIncome    = parseFloat(inputs.annual_income) || 0
  const expectedReturn  = parseFloat(inputs.expected_return) / 100 || 0.07
  const withdrawalRate  = parseFloat(inputs.withdrawal_rate) / 100 || 0.04

  const fireNumber    = withdrawalRate > 0 ? annualExpenses / withdrawalRate : 0
  const annualSavings = annualIncome * savingsRate

  // Simulate even with zero contributions — an existing portfolio can still
  // compound its way to the target. `null` = not reached within 100 years.
  let years = 0
  let balance = currentSavings
  if (fireNumber > 0 && balance < fireNumber) {
    while (balance < fireNumber && years < 100) {
      balance = balance * (1 + expectedReturn) + annualSavings
      years++
    }
    if (balance < fireNumber) years = null
  }

  const chartData = []
  const totalYears = years != null ? Math.min(years + 5, 50) : 40
  let bal = currentSavings
  let contribTotal = currentSavings
  for (let y = 0; y <= totalYears; y++) {
    chartData.push({
      year: y,
      portfolio: Math.round(bal),
      contributions: Math.round(contribTotal),
      target: Math.round(fireNumber),
    })
    bal = bal * (1 + expectedReturn) + annualSavings
    contribTotal += annualSavings
  }

  return {
    fireNumber,
    annualSavings,
    yearsToFire: years,
    retirementYear: years != null ? new Date().getFullYear() + Math.ceil(years) : null,
    chartData,
    fireYear: years,
  }
}

export default function FIRECalculator({ initialData, onDataChange }) {
  const { inputs, set } = useCalculatorInputs({
    defaults: DEFAULTS,
    initialData,
    onDataChange,
    calcType: 'fire',
  })

  const results = calculate(inputs)

  const progressPct = results.fireNumber > 0
    ? Math.min(100, ((parseFloat(inputs.current_savings) || 0) / results.fireNumber) * 100)
    : 0

  return (
    <div className="space-y-6">

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="FIRE Number"
          value={fmt(results.fireNumber)}
          sub="Target portfolio"
          Icon={Flame}
          iconClass="text-emerald-500"
          gradientClass="from-emerald-500 to-teal-600"
        />
        <StatCard
          label="Years to FIRE"
          value={results.yearsToFire != null ? `${Math.ceil(results.yearsToFire)} yrs` : '100+'}
          sub={results.retirementYear ? `Retiring ${results.retirementYear}` : 'Adjust inputs'}
          Icon={TrendingUp}
          iconClass="text-blue-500"
          gradientClass="from-blue-500 to-indigo-600"
        />
        <StatCard
          label="Annual Savings"
          value={fmt(results.annualSavings)}
          sub="Invested per year"
          Icon={PiggyBank}
          iconClass="text-violet-500"
          gradientClass="from-violet-500 to-purple-600"
        />
        <StatCard
          label="Savings Rate"
          value={`${finiteOr(parseFloat(inputs.savings_rate), 0).toFixed(0)}%`}
          sub="Of gross income"
          Icon={Percent}
          iconClass="text-amber-500"
          gradientClass="from-amber-400 to-orange-500"
        />
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-baseline mb-3">
          <h3 className="text-xl font-bold text-gray-800">Progress to FIRE</h3>
          <span className="text-sm text-gray-400">
            {fmt(parseFloat(inputs.current_savings) || 0)} / {fmt(results.fireNumber)}
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-500"
            style={{ width: `${progressPct}%`, minWidth: progressPct > 0 ? '6px' : '0' }}
          />
        </div>
        <p className="text-sm text-gray-400 mt-2">{progressPct.toFixed(1)}% of your FIRE number saved</p>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-xl font-bold text-gray-800">Wealth Projection</h3>
          <div className="flex gap-4 text-xs text-gray-400">
            {[
              { color: '#3b82f6', label: 'Portfolio',     dashed: false },
              { color: '#10b981', label: 'Contributions', dashed: true  },
              { color: '#ef4444', label: 'FIRE target',   dashed: true  },
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
              <linearGradient id="gBlue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={v => `Yr ${v}`} />
            <YAxis domain={[0, dataMax => Math.min(dataMax, 1e15)]} tickFormatter={fmt} tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} width={54} />
            <Tooltip content={<ChartTooltip fmt={fmt} />} />
            {results.fireYear != null && (
              <ReferenceLine x={results.fireYear} stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1.5}
                label={{ value: 'FIRE', position: 'insideTopRight', fontSize: 10, fill: '#ef4444' }} />
            )}
            <Area type="monotone" dataKey="contributions" name="Contributions" stroke="#10b981" strokeWidth={1.5} fill="url(#gGreen)" strokeDasharray="5 3" dot={false} />
            <Area type="monotone" dataKey="portfolio"     name="Portfolio"     stroke="#3b82f6" strokeWidth={2}   fill="url(#gBlue)"  dot={false} />
            <Area type="monotone" dataKey="target"        name="FIRE target"   stroke="#ef4444" strokeWidth={1.5} fill="none"         strokeDasharray="6 3" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Your finances</h3>
          <div className="space-y-4">
            <NumInput label="Annual Income"   prefix="$" value={inputs.annual_income}   onChange={set('annual_income')}   min={0} max={MONEY_MAX} />
            <NumInput label="Annual Expenses" prefix="$" value={inputs.annual_expenses} onChange={set('annual_expenses')} min={0} max={MONEY_MAX} />
            <NumInput label="Savings Rate"    suffix="%" value={inputs.savings_rate}    onChange={set('savings_rate')}    min={0} max={100} />
            <NumInput label="Current Savings" prefix="$" value={inputs.current_savings} onChange={set('current_savings')} min={0} max={MONEY_MAX} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Assumptions</h3>
          <div className="space-y-4">
            <NumInput label="Expected Return" hint="per year" suffix="%" value={inputs.expected_return} onChange={set('expected_return')} min={0} max={30} step={0.1} />
            <NumInput label="Withdrawal Rate" hint="safe withdrawal" suffix="%" value={inputs.withdrawal_rate} onChange={set('withdrawal_rate')} min={0.1} max={20} step={0.1} />
          </div>

          <div className="mt-5 bg-gradient-to-r from-blue-50 to-emerald-50 border border-blue-100 rounded-lg p-4">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Insight</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              {results.yearsToFire != null ? (
                <>
                  Saving <strong className="text-gray-800">{fmt(results.annualSavings)}/yr</strong> puts you
                  on track to retire in <strong className="text-gray-800">{Math.ceil(results.yearsToFire)} years</strong>
                  {results.retirementYear && <> ({results.retirementYear})</>}.
                </>
              ) : (
                <>At your current rate you won't reach FIRE in 100 years. Increase savings or reduce expenses.</>
              )}
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
