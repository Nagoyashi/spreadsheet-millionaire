import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { DollarSign, TrendingUp, Repeat, Wallet } from 'lucide-react'
import StatCard from '../components/ui/StatCard'
import NumInput from '../components/ui/NumInput'
import ChartTooltip from '../components/ui/ChartTooltip'

const DEFAULTS = {
  portfolio_value: 100000,
  dividend_yield: 3.5,
  dividend_growth: 5,
  annual_contribution: 12000,
  years: 20,
  tax_rate: 15,
}

function fmt(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`
  return `$${Math.round(n)}`
}

function calculate(inputs) {
  const portfolio     = parseFloat(inputs.portfolio_value) || 0
  const yieldRate     = parseFloat(inputs.dividend_yield) / 100 || 0
  const growthRate    = parseFloat(inputs.dividend_growth) / 100 || 0
  const contribution  = parseFloat(inputs.annual_contribution) || 0
  const years         = parseFloat(inputs.years) || 0
  const taxRate       = parseFloat(inputs.tax_rate) / 100 || 0

  const annualDividend     = portfolio * yieldRate
  const monthlyDividend    = annualDividend / 12
  const afterTaxAnnual     = annualDividend * (1 - taxRate)
  const afterTaxMonthly    = afterTaxAnnual / 12

  // Project portfolio growth with reinvested dividends + contributions
  const chartData = []
  let currentPortfolio = portfolio
  let currentYield = yieldRate
  for (let y = 0; y <= years; y++) {
    const yearDividend = currentPortfolio * currentYield
    chartData.push({
      year: y,
      portfolio: Math.round(currentPortfolio),
      annualIncome: Math.round(yearDividend * (1 - taxRate)),
    })
    currentPortfolio = currentPortfolio + yearDividend + contribution
    currentYield = yieldRate // yield stays constant; portfolio grows
  }

  const finalPortfolio   = chartData[chartData.length - 1]?.portfolio || 0
  const finalAnnualIncome = chartData[chartData.length - 1]?.annualIncome || 0

  return { annualDividend, monthlyDividend, afterTaxAnnual, afterTaxMonthly, finalPortfolio, finalAnnualIncome, chartData }
}

export default function DividendCalculator({ initialData, onDataChange }) {
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
          label="Annual Dividend"
          value={fmt(results.afterTaxAnnual)}
          sub="After tax income today"
          Icon={DollarSign}
          iconClass="text-emerald-500"
          gradientClass="from-emerald-500 to-teal-600"
        />
        <StatCard
          label="Monthly Dividend"
          value={fmt(results.afterTaxMonthly)}
          sub="Passive income per month"
          Icon={Wallet}
          iconClass="text-blue-500"
          gradientClass="from-blue-500 to-indigo-600"
        />
        <StatCard
          label={`Income in ${inputs.years}yrs`}
          value={fmt(results.finalAnnualIncome)}
          sub="Annual after-tax income"
          Icon={TrendingUp}
          iconClass="text-violet-500"
          gradientClass="from-violet-500 to-purple-600"
        />
        <StatCard
          label={`Portfolio in ${inputs.years}yrs`}
          value={fmt(results.finalPortfolio)}
          sub="With reinvestment + contributions"
          Icon={Repeat}
          iconClass="text-amber-500"
          gradientClass="from-amber-400 to-orange-500"
        />
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-xl font-bold text-gray-800">Portfolio & Income Growth</h3>
          <div className="flex gap-4 text-xs text-gray-400">
            {[
              { color: '#10b981', label: 'Portfolio value' },
              { color: '#3b82f6', label: 'Annual income (after tax)', dashed: true },
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
              <linearGradient id="gGreenDiv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gBlueDiv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={v => `Yr ${v}`} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} width={54} />
            <Tooltip content={<ChartTooltip fmt={fmt} />} />
            <Area type="monotone" dataKey="annualIncome" name="Annual income" stroke="#3b82f6" strokeWidth={1.5} fill="url(#gBlueDiv)" strokeDasharray="5 3" dot={false} />
            <Area type="monotone" dataKey="portfolio"    name="Portfolio"     stroke="#10b981" strokeWidth={2}   fill="url(#gGreenDiv)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Portfolio</h3>
          <div className="space-y-4">
            <NumInput label="Current Portfolio Value" prefix="$" value={inputs.portfolio_value}     onChange={set('portfolio_value')}     min={0} />
            <NumInput label="Annual Contribution"      prefix="$" value={inputs.annual_contribution} onChange={set('annual_contribution')} min={0} />
            <NumInput label="Time Horizon"             suffix="yrs" value={inputs.years}             onChange={set('years')}               min={1} max={60} step={1} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Dividend Assumptions</h3>
          <div className="space-y-4">
            <NumInput label="Dividend Yield"    hint="current" suffix="%" value={inputs.dividend_yield}  onChange={set('dividend_yield')}  min={0} max={20} step={0.1} />
            <NumInput label="Dividend Growth"   hint="per year" suffix="%" value={inputs.dividend_growth} onChange={set('dividend_growth')} min={0} max={20} step={0.1} />
            <NumInput label="Dividend Tax Rate" suffix="%" value={inputs.tax_rate} onChange={set('tax_rate')} min={0} max={50} step={0.5} />
          </div>

          <div className="mt-5 bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-100 rounded-lg p-4">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Insight</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Your portfolio generates <strong className="text-gray-800">{fmt(results.afterTaxMonthly)}/month</strong> today.
              In {inputs.years} years that grows to <strong className="text-gray-800">{fmt(results.finalAnnualIncome / 12)}/month</strong> — reinvesting dividends is key.
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
