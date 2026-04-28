import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { Home, DollarSign, Percent, Calendar } from 'lucide-react'
import StatCard from '../components/ui/StatCard'
import NumInput from '../components/ui/NumInput'
import ChartTooltip from '../components/ui/ChartTooltip'

const DEFAULTS = {
  home_price: 400000,
  down_payment: 80000,
  annual_rate: 6.5,
  loan_term: 30,
  property_tax_rate: 1.2,
  insurance_monthly: 150,
}

function fmt(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`
  return `$${Math.round(n)}`
}

function calculate(inputs) {
  const homePrice    = parseFloat(inputs.home_price) || 0
  const downPayment  = parseFloat(inputs.down_payment) || 0
  const annualRate   = parseFloat(inputs.annual_rate) / 100 || 0
  const termYears    = parseFloat(inputs.loan_term) || 30
  const taxRate      = parseFloat(inputs.property_tax_rate) / 100 || 0
  const insurance    = parseFloat(inputs.insurance_monthly) || 0

  const principal    = homePrice - downPayment
  const monthlyRate  = annualRate / 12
  const numPayments  = termYears * 12
  const downPct      = homePrice > 0 ? (downPayment / homePrice) * 100 : 0

  const monthlyMortgage = principal > 0 && monthlyRate > 0
    ? principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
    : principal / numPayments

  const monthlyTax   = (homePrice * taxRate) / 12
  const totalMonthly = monthlyMortgage + monthlyTax + insurance
  const totalCost    = totalMonthly * numPayments - monthlyTax * numPayments - insurance * numPayments + downPayment
  const totalInterest = (monthlyMortgage * numPayments) - principal

  // Build amortisation chart (yearly)
  const chartData = []
  let balance = principal
  for (let y = 1; y <= termYears; y++) {
    let yearInterest = 0
    let yearPrincipal = 0
    for (let m = 0; m < 12; m++) {
      const interestPayment  = balance * monthlyRate
      const principalPayment = monthlyMortgage - interestPayment
      yearInterest  += interestPayment
      yearPrincipal += principalPayment
      balance = Math.max(0, balance - principalPayment)
    }
    chartData.push({
      year: y,
      balance: Math.round(balance),
      principal: Math.round(yearPrincipal),
      interest: Math.round(yearInterest),
    })
  }

  return { monthlyMortgage, totalMonthly, totalInterest, totalCost, downPct, principal, chartData }
}

export default function MortgageCalculator({ initialData, onDataChange }) {
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
          label="Monthly Payment"
          value={fmt(results.totalMonthly)}
          sub="Mortgage + tax + insurance"
          Icon={Home}
          iconClass="text-blue-500"
          gradientClass="from-blue-500 to-indigo-600"
        />
        <StatCard
          label="Principal + Interest"
          value={fmt(results.monthlyMortgage)}
          sub="Loan payment only"
          Icon={DollarSign}
          iconClass="text-emerald-500"
          gradientClass="from-emerald-500 to-teal-600"
        />
        <StatCard
          label="Total Interest"
          value={fmt(results.totalInterest)}
          sub={`Over ${inputs.loan_term} years`}
          Icon={Percent}
          iconClass="text-red-500"
          gradientClass="from-red-500 to-rose-600"
        />
        <StatCard
          label="Down Payment"
          value={`${results.downPct.toFixed(1)}%`}
          sub={fmt(parseFloat(inputs.down_payment))}
          Icon={Calendar}
          iconClass="text-amber-500"
          gradientClass="from-amber-400 to-orange-500"
        />
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-xl font-bold text-gray-800">Loan Balance Over Time</h3>
          <div className="flex gap-4 text-xs text-gray-400">
            {[
              { color: '#3b82f6', label: 'Remaining balance' },
              { color: '#ef4444', label: 'Annual interest', dashed: true },
              { color: '#10b981', label: 'Annual principal', dashed: true },
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
              <linearGradient id="gBlueMort" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={v => `Yr ${v}`} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} width={54} />
            <Tooltip content={<ChartTooltip fmt={fmt} />} />
            <Area type="monotone" dataKey="interest"  name="Annual interest"   stroke="#ef4444" strokeWidth={1.5} fill="none" strokeDasharray="5 3" dot={false} />
            <Area type="monotone" dataKey="principal" name="Annual principal"  stroke="#10b981" strokeWidth={1.5} fill="none" strokeDasharray="5 3" dot={false} />
            <Area type="monotone" dataKey="balance"   name="Remaining balance" stroke="#3b82f6" strokeWidth={2}   fill="url(#gBlueMort)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Property</h3>
          <div className="space-y-4">
            <NumInput label="Home Price"         prefix="$"   value={inputs.home_price}    onChange={set('home_price')}    min={0} />
            <NumInput label="Down Payment"       prefix="$"   value={inputs.down_payment}  onChange={set('down_payment')}  min={0} />
            <NumInput label="Loan Term"          suffix="yrs" value={inputs.loan_term}     onChange={set('loan_term')}     min={1} max={30} step={1} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Costs</h3>
          <div className="space-y-4">
            <NumInput label="Annual Interest Rate"  suffix="%" value={inputs.annual_rate}          onChange={set('annual_rate')}          min={0} max={20} step={0.1} />
            <NumInput label="Property Tax Rate"     suffix="%" value={inputs.property_tax_rate}    onChange={set('property_tax_rate')}    min={0} max={5}  step={0.1} hint="per year" />
            <NumInput label="Home Insurance"        prefix="$" value={inputs.insurance_monthly}    onChange={set('insurance_monthly')}    min={0} hint="per month" />
          </div>

          <div className="mt-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg p-4">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Insight</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Loan amount: <strong className="text-gray-800">{fmt(results.principal)}</strong>.
              Total interest over {inputs.loan_term} years: <strong className="text-gray-800">{fmt(results.totalInterest)}</strong> —
              {results.principal > 0 ? ` ${((results.totalInterest / results.principal) * 100).toFixed(0)}% of the loan principal.` : '.'}
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
