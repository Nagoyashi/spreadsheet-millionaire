import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { Wallet, Calendar, TrendingDown, Percent } from 'lucide-react'
import StatCard from '../components/ui/StatCard'
import NumInput from '../components/ui/NumInput'
import ChartTooltip from '../components/ui/ChartTooltip'

const DEFAULTS = {
  portfolio_value: 1000000,
  annual_withdrawal: 40000,
  expected_return: 5,
  inflation_rate: 2.5,
  years: 30,
}

function fmt(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`
  return `$${Math.round(n)}`
}

function calculate(inputs) {
  const portfolio   = parseFloat(inputs.portfolio_value) || 0
  const withdrawal  = parseFloat(inputs.annual_withdrawal) || 0
  const returnRate  = parseFloat(inputs.expected_return) / 100 || 0
  const inflation   = parseFloat(inputs.inflation_rate) / 100 || 0
  const years       = parseFloat(inputs.years) || 0

  const withdrawalRate = portfolio > 0 ? (withdrawal / portfolio) * 100 : 0
  const realReturn     = returnRate - inflation

  // Find how long money lasts (may exceed years)
  let balance = portfolio
  let depletionYear = null
  const chartData = []

  for (let y = 0; y <= Math.max(years, 50); y++) {
    chartData.push({ year: y, balance: Math.max(0, Math.round(balance)) })
    if (balance <= 0 && depletionYear === null) {
      depletionYear = y
    }
    if (y >= years && depletionYear !== null) break
    const inflationAdjustedWithdrawal = withdrawal * Math.pow(1 + inflation, y)
    balance = balance * (1 + returnRate) - inflationAdjustedWithdrawal
  }

  const finalBalance = Math.max(0, balance)
  const sustainable  = depletionYear === null

  return { withdrawalRate, realReturn, depletionYear, finalBalance, sustainable, chartData }
}

export default function WithdrawalPlanCalculator({ initialData, onDataChange }) {
  const [inputs, setInputs] = useState({ ...DEFAULTS, ...initialData })

  useEffect(() => {
    if (initialData) setInputs({ ...DEFAULTS, ...initialData })
  }, [initialData])

  useEffect(() => { onDataChange?.(inputs) }, [inputs, onDataChange])

  const set = key => val => setInputs(prev => ({ ...prev, [key]: val }))
  const results = calculate(inputs)

  const statusColor  = results.sustainable ? 'from-emerald-50 to-teal-50 border-emerald-100' : 'from-red-50 to-rose-50 border-red-100'
  const statusText   = results.sustainable ? 'emerald' : 'red'

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Withdrawal Rate"
          value={`${results.withdrawalRate.toFixed(1)}%`}
          sub={results.withdrawalRate <= 4 ? 'Safe zone (≤4%)' : 'Above safe zone (>4%)'}
          Icon={Percent}
          iconClass={results.withdrawalRate <= 4 ? 'text-emerald-500' : 'text-red-500'}
          gradientClass={results.withdrawalRate <= 4 ? 'from-emerald-500 to-teal-600' : 'from-red-500 to-rose-600'}
        />
        <StatCard
          label="Portfolio Lasts"
          value={results.sustainable ? `${inputs.years}+ yrs` : `${results.depletionYear} yrs`}
          sub={results.sustainable ? 'Sustainable' : 'Runs out of money'}
          Icon={Calendar}
          iconClass={results.sustainable ? 'text-emerald-500' : 'text-red-500'}
          gradientClass={results.sustainable ? 'from-emerald-500 to-teal-600' : 'from-red-500 to-rose-600'}
        />
        <StatCard
          label={`Balance at ${inputs.years}yrs`}
          value={results.sustainable ? fmt(results.finalBalance) : '$0'}
          sub={results.sustainable ? 'Remaining portfolio' : 'Depleted'}
          Icon={Wallet}
          iconClass="text-blue-500"
          gradientClass="from-blue-500 to-indigo-600"
        />
        <StatCard
          label="Real Return"
          value={`${results.realReturn.toFixed(1)}%`}
          sub="After inflation"
          Icon={TrendingDown}
          iconClass="text-violet-500"
          gradientClass="from-violet-500 to-purple-600"
        />
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Portfolio Depletion</h3>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={results.chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gBlueWith" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={v => `Yr ${v}`} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} width={54} />
            <Tooltip content={<ChartTooltip fmt={fmt} />} />
            {results.depletionYear && (
              <ReferenceLine x={results.depletionYear} stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1.5}
                label={{ value: 'Depleted', position: 'insideTopRight', fontSize: 10, fill: '#ef4444' }} />
            )}
            <Area type="monotone" dataKey="balance" name="Portfolio balance" stroke="#3b82f6" strokeWidth={2} fill="url(#gBlueWith)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Your Retirement Portfolio</h3>
          <div className="space-y-4">
            <NumInput label="Starting Portfolio"   prefix="$"   value={inputs.portfolio_value}   onChange={set('portfolio_value')}   min={0} />
            <NumInput label="Annual Withdrawal"    prefix="$"   value={inputs.annual_withdrawal}  onChange={set('annual_withdrawal')}  min={0} />
            <NumInput label="Retirement Duration"  suffix="yrs" value={inputs.years}              onChange={set('years')}              min={1} max={60} step={1} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Assumptions</h3>
          <div className="space-y-4">
            <NumInput label="Expected Return" hint="per year" suffix="%" value={inputs.expected_return} onChange={set('expected_return')} min={0} max={20} step={0.1} />
            <NumInput label="Inflation Rate"  hint="per year" suffix="%" value={inputs.inflation_rate}  onChange={set('inflation_rate')}  min={0} max={15} step={0.1} />
          </div>

          <div className={`mt-5 bg-gradient-to-r ${statusColor} border rounded-lg p-4`}>
            <p className={`text-xs font-semibold text-${statusText}-600 uppercase tracking-wider mb-1`}>
              {results.sustainable ? '✓ Sustainable' : '⚠ Unsustainable'}
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              {results.sustainable
                ? <>Your <strong className="text-gray-800">{results.withdrawalRate.toFixed(1)}%</strong> withdrawal rate is sustainable.
                   Portfolio grows to <strong className="text-gray-800">{fmt(results.finalBalance)}</strong> after {inputs.years} years.</>
                : <>At this rate your portfolio runs out in <strong className="text-gray-800">{results.depletionYear} years</strong>.
                   Reduce withdrawals or increase portfolio size.</>
              }
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
