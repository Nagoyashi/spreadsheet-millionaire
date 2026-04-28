import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { Anchor, TrendingUp, Calendar, DollarSign } from 'lucide-react'
import StatCard from '../components/ui/StatCard'
import NumInput from '../components/ui/NumInput'
import ChartTooltip from '../components/ui/ChartTooltip'

const DEFAULTS = {
  current_savings: 50000,
  annual_contribution: 15000,
  expected_return: 7,
  withdrawal_rate: 4,
  annual_expenses: 40000,
  current_age: 30,
  retirement_age: 65,
}

function fmt(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`
  return `$${Math.round(n)}`
}

function calculate(inputs) {
  const savings       = parseFloat(inputs.current_savings) || 0
  const contribution  = parseFloat(inputs.annual_contribution) || 0
  const returnRate    = parseFloat(inputs.expected_return) / 100 || 0.07
  const withdrawalRate = parseFloat(inputs.withdrawal_rate) / 100 || 0.04
  const expenses      = parseFloat(inputs.annual_expenses) || 0
  const currentAge    = parseFloat(inputs.current_age) || 30
  const retirementAge = parseFloat(inputs.retirement_age) || 65

  const yearsToRetirement = retirementAge - currentAge
  const fireNumber        = withdrawalRate > 0 ? expenses / withdrawalRate : 0

  // Coast FIRE number: amount needed NOW to hit FIRE number at retirement with no more contributions
  const coastNumber = fireNumber / Math.pow(1 + returnRate, yearsToRetirement)

  const hasCoasted   = savings >= coastNumber
  const coastGap     = Math.max(0, coastNumber - savings)

  // Years until coast number is reached with current contributions
  let yearsToCoast = 0
  let bal = savings
  while (bal < coastNumber && yearsToCoast < yearsToRetirement) {
    bal = bal * (1 + returnRate) + contribution
    yearsToCoast++
  }
  const coastAge = currentAge + yearsToCoast

  // Chart: portfolio with contributions until coast, then coasting to retirement
  const chartData = []
  bal = savings
  for (let y = 0; y <= yearsToRetirement; y++) {
    chartData.push({
      year: currentAge + y,
      withContributions: Math.round(bal),
      coastOnly: Math.round(savings * Math.pow(1 + returnRate, y)),
      target: Math.round(fireNumber),
      coastTarget: Math.round(coastNumber),
    })
    if (y < yearsToCoast) {
      bal = bal * (1 + returnRate) + contribution
    } else {
      bal = bal * (1 + returnRate)
    }
  }

  return { fireNumber, coastNumber, hasCoasted, coastGap, yearsToCoast, coastAge, chartData }
}

export default function CoastFIRECalculator({ initialData, onDataChange }) {
  const [inputs, setInputs] = useState({ ...DEFAULTS, ...initialData })

  useEffect(() => {
    if (initialData) setInputs({ ...DEFAULTS, ...initialData })
  }, [initialData])

  useEffect(() => { onDataChange?.(inputs) }, [inputs, onDataChange])

  const set = key => val => setInputs(prev => ({ ...prev, [key]: val }))
  const results = calculate(inputs)

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Coast FIRE Number"
          value={fmt(results.coastNumber)}
          sub="Needed to stop contributing now"
          Icon={Anchor}
          iconClass="text-blue-500"
          gradientClass="from-blue-500 to-indigo-600"
        />
        <StatCard
          label="FIRE Number"
          value={fmt(results.fireNumber)}
          sub="Target at retirement"
          Icon={TrendingUp}
          iconClass="text-emerald-500"
          gradientClass="from-emerald-500 to-teal-600"
        />
        <StatCard
          label={results.hasCoasted ? 'Already Coasting!' : 'Gap to Coast'}
          value={results.hasCoasted ? '✓ Done' : fmt(results.coastGap)}
          sub={results.hasCoasted ? 'You can stop contributing' : 'Until you can coast'}
          Icon={DollarSign}
          iconClass={results.hasCoasted ? 'text-emerald-500' : 'text-amber-500'}
          gradientClass={results.hasCoasted ? 'from-emerald-500 to-teal-600' : 'from-amber-400 to-orange-500'}
        />
        <StatCard
          label="Coast Age"
          value={results.hasCoasted ? `Age ${inputs.current_age}` : `Age ${results.coastAge}`}
          sub={results.hasCoasted ? 'Right now' : `In ${results.yearsToCoast} years`}
          Icon={Calendar}
          iconClass="text-violet-500"
          gradientClass="from-violet-500 to-purple-600"
        />
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-xl font-bold text-gray-800">Path to Coast FIRE</h3>
          <div className="flex gap-4 text-xs text-gray-400">
            {[
              { color: '#3b82f6', label: 'With contributions', dashed: false },
              { color: '#10b981', label: 'Coast only (no contributions)', dashed: true },
              { color: '#ef4444', label: 'FIRE target', dashed: true },
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
              <linearGradient id="gBlueCoast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={v => `Age ${v}`} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} width={54} />
            <Tooltip content={<ChartTooltip fmt={fmt} />} />
            {!results.hasCoasted && (
              <ReferenceLine x={results.coastAge} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1.5}
                label={{ value: 'Coast', position: 'insideTopRight', fontSize: 10, fill: '#f59e0b' }} />
            )}
            <Area type="monotone" dataKey="target"           name="FIRE target"       stroke="#ef4444" strokeWidth={1.5} fill="none"           strokeDasharray="6 3" dot={false} />
            <Area type="monotone" dataKey="coastOnly"        name="Coast (no contrib)" stroke="#10b981" strokeWidth={1.5} fill="none"           strokeDasharray="5 3" dot={false} />
            <Area type="monotone" dataKey="withContributions" name="With contributions" stroke="#3b82f6" strokeWidth={2}   fill="url(#gBlueCoast)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Your Finances</h3>
          <div className="space-y-4">
            <NumInput label="Current Savings"      prefix="$"   value={inputs.current_savings}     onChange={set('current_savings')}     min={0} />
            <NumInput label="Annual Contribution"  prefix="$"   value={inputs.annual_contribution}  onChange={set('annual_contribution')}  min={0} />
            <NumInput label="Annual Expenses"      prefix="$"   value={inputs.annual_expenses}      onChange={set('annual_expenses')}      min={0} hint="in retirement" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Assumptions</h3>
          <div className="space-y-4">
            <NumInput label="Current Age"      suffix="yrs" value={inputs.current_age}     onChange={set('current_age')}     min={18} max={80} step={1} />
            <NumInput label="Retirement Age"   suffix="yrs" value={inputs.retirement_age}  onChange={set('retirement_age')}  min={30} max={80} step={1} />
            <NumInput label="Expected Return"  suffix="%"   value={inputs.expected_return}  onChange={set('expected_return')}  min={0} max={20} step={0.1} />
            <NumInput label="Withdrawal Rate"  suffix="%"   value={inputs.withdrawal_rate}  onChange={set('withdrawal_rate')}  min={0} max={10} step={0.1} />
          </div>
        </div>
      </div>

    </div>
  )
}
