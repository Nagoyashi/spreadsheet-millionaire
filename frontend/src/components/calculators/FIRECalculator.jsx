import { useState, useEffect } from 'react'

const DEFAULTS = {
  annual_expenses: 40000,
  savings_rate: 50,
  current_savings: 0,
  annual_income: 80000,
  expected_return: 7,
  withdrawal_rate: 4,
}

function fmt(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

function calculate(inputs) {
  const annualExpenses   = parseFloat(inputs.annual_expenses) || 0
  const savingsRate      = parseFloat(inputs.savings_rate) / 100 || 0
  const currentSavings   = parseFloat(inputs.current_savings) || 0
  const annualIncome     = parseFloat(inputs.annual_income) || 0
  const expectedReturn   = parseFloat(inputs.expected_return) / 100 || 0.07
  const withdrawalRate   = parseFloat(inputs.withdrawal_rate) / 100 || 0.04

  const fireNumber       = withdrawalRate > 0 ? annualExpenses / withdrawalRate : 0
  const annualSavings    = annualIncome * savingsRate
  const monthlyContrib   = annualSavings / 12

  // Years to FIRE using FV formula: FV = PV*(1+r)^n + PMT*((1+r)^n - 1)/r
  let years = 0
  if (annualSavings > 0 && fireNumber > 0) {
    const r = expectedReturn
    if (r === 0) {
      years = (fireNumber - currentSavings) / annualSavings
    } else {
      // Solve numerically (simple iteration — fast enough for UI)
      let balance = currentSavings
      while (balance < fireNumber && years < 100) {
        balance = balance * (1 + r) + annualSavings
        years++
      }
      if (years >= 100) years = null // won't reach FIRE
    }
  }

  return {
    fireNumber,
    annualSavings,
    monthlyContrib,
    yearsToFire: years,
    projectedRetirementYear: years != null ? new Date().getFullYear() + Math.ceil(years) : null,
  }
}

// ─── Input Row ────────────────────────────────────────────────────────────────
function InputRow({ label, hint, prefix, suffix, value, onChange, min, max, step = 'any' }) {
  return (
    <div>
      <label className="font-mono text-xs text-stone-500 uppercase tracking-widest block mb-1.5">
        {label}
        {hint && <span className="ml-2 text-stone-600 normal-case font-body">{hint}</span>}
      </label>
      <div className="flex items-center border border-stone-700 focus-within:border-amber-400 transition-colors bg-stone-900">
        {prefix && (
          <span className="font-mono text-sm text-stone-500 px-3 border-r border-stone-700">{prefix}</span>
        )}
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          min={min}
          max={max}
          step={step}
          className="flex-1 bg-transparent text-stone-100 font-mono text-sm px-3 py-2.5 focus:outline-none"
        />
        {suffix && (
          <span className="font-mono text-sm text-stone-500 px-3 border-l border-stone-700">{suffix}</span>
        )}
      </div>
    </div>
  )
}

// ─── Result Card ──────────────────────────────────────────────────────────────
function ResultCard({ label, value, highlight }) {
  return (
    <div className={`border p-4 ${highlight ? 'border-amber-400/40 bg-amber-400/5' : 'border-stone-800 bg-stone-900/50'}`}>
      <p className="font-mono text-xs text-stone-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={`font-display text-2xl ${highlight ? 'text-amber-400' : 'text-stone-100'}`}>{value}</p>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FIRECalculator({ initialData, onDataChange }) {
  const [inputs, setInputs] = useState({ ...DEFAULTS, ...initialData })

  // When a saved calc is loaded, replace all inputs
  useEffect(() => {
    if (initialData) setInputs({ ...DEFAULTS, ...initialData })
  }, [initialData])

  // Notify parent of every change so it can pass current data to Save
  useEffect(() => {
    onDataChange?.(inputs)
  }, [inputs, onDataChange])

  function set(key) {
    return (val) => setInputs(prev => ({ ...prev, [key]: val }))
  }

  const results = calculate(inputs)

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-8">
        <p className="font-mono text-xs text-amber-400 uppercase tracking-widest mb-1">Calculator</p>
        <h2 className="font-display text-3xl text-stone-100">FIRE</h2>
        <p className="font-body text-sm text-stone-500 mt-1">Financial Independence, Retire Early</p>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <InputRow label="Annual Expenses" prefix="$" value={inputs.annual_expenses} onChange={set('annual_expenses')} min={0} />
        <InputRow label="Annual Income" prefix="$" value={inputs.annual_income} onChange={set('annual_income')} min={0} />
        <InputRow label="Savings Rate" suffix="%" value={inputs.savings_rate} onChange={set('savings_rate')} min={0} max={100} />
        <InputRow label="Current Savings" prefix="$" value={inputs.current_savings} onChange={set('current_savings')} min={0} />
        <InputRow label="Expected Return" hint="per year" suffix="%" value={inputs.expected_return} onChange={set('expected_return')} min={0} max={30} step={0.1} />
        <InputRow label="Withdrawal Rate" hint="safe withdrawal" suffix="%" value={inputs.withdrawal_rate} onChange={set('withdrawal_rate')} min={0.1} max={20} step={0.1} />
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
        <ResultCard label="FIRE Number" value={fmt(results.fireNumber)} highlight />
        <ResultCard
          label="Years to FIRE"
          value={results.yearsToFire != null ? `${Math.ceil(results.yearsToFire)} yrs` : '> 100'}
          highlight
        />
        <ResultCard
          label="Retirement Year"
          value={results.projectedRetirementYear ?? '—'}
        />
        <ResultCard
          label="Annual Savings"
          value={fmt(results.annualSavings)}
        />
      </div>
    </div>
  )
}
