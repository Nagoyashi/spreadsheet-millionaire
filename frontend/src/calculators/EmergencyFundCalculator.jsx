import { Shield, Calendar, DollarSign, TrendingUp } from 'lucide-react'
import StatCard from '../components/ui/StatCard'
import NumInput from '../components/ui/NumInput'
import { useCalculatorInputs } from '../hooks/useCalculatorInputs'
import { fmt } from '../utils/format'

const DEFAULTS = {
  version: 1,
  monthly_expenses: 3500,
  target_months: 6,
  current_savings: 5000,
  monthly_contribution: 500,
  interest_rate: 4.5,
}

function calculate(inputs) {
  const expenses      = parseFloat(inputs.monthly_expenses) || 0
  const months        = parseFloat(inputs.target_months) || 0
  const current       = parseFloat(inputs.current_savings) || 0
  const contribution  = parseFloat(inputs.monthly_contribution) || 0
  const rate          = parseFloat(inputs.interest_rate) / 100 / 12 || 0

  const targetAmount  = expenses * months
  const gap           = Math.max(0, targetAmount - current)
  const progressPct   = targetAmount > 0 ? Math.min(100, (current / targetAmount) * 100) : 0
  const alreadyFunded = current >= targetAmount

  // Months to reach target with contributions + interest
  let monthsToGoal = 0
  let bal = current
  while (bal < targetAmount && monthsToGoal < 600) {
    bal = bal * (1 + rate) + contribution
    monthsToGoal++
  }

  const interestEarned = alreadyFunded ? 0 : (bal - current - contribution * monthsToGoal)

  return { targetAmount, gap, progressPct, alreadyFunded, monthsToGoal, interestEarned }
}

export default function EmergencyFundCalculator({ initialData, onDataChange }) {
  const { inputs, set } = useCalculatorInputs({
    defaults: DEFAULTS,
    initialData,
    onDataChange,
    calcType: 'emergency_fund',
  })
  const results = calculate(inputs)

  const MONTH_PRESETS = [3, 6, 9, 12]

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Target Fund"
          value={fmt(results.targetAmount)}
          sub={`${inputs.target_months} months of expenses`}
          Icon={Shield}
          iconClass="text-emerald-500"
          gradientClass="from-emerald-500 to-teal-600"
        />
        <StatCard
          label={results.alreadyFunded ? 'Fully Funded!' : 'Amount Remaining'}
          value={results.alreadyFunded ? '✓ Done' : fmt(results.gap)}
          sub={results.alreadyFunded ? 'Emergency fund complete' : 'Until target reached'}
          Icon={DollarSign}
          iconClass={results.alreadyFunded ? 'text-emerald-500' : 'text-amber-500'}
          gradientClass={results.alreadyFunded ? 'from-emerald-500 to-teal-600' : 'from-amber-400 to-orange-500'}
        />
        <StatCard
          label="Time to Goal"
          value={results.alreadyFunded ? '0 months' : `${results.monthsToGoal} mo`}
          sub={results.alreadyFunded ? 'Already there' : `~${(results.monthsToGoal / 12).toFixed(1)} years`}
          Icon={Calendar}
          iconClass="text-blue-500"
          gradientClass="from-blue-500 to-indigo-600"
        />
        <StatCard
          label="Coverage"
          value={`${results.progressPct.toFixed(0)}%`}
          sub={`${fmt(parseFloat(inputs.current_savings))} saved`}
          Icon={TrendingUp}
          iconClass="text-violet-500"
          gradientClass="from-violet-500 to-purple-600"
        />
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-baseline mb-3">
          <h3 className="text-xl font-bold text-gray-800">Fund Progress</h3>
          <span className="text-sm text-gray-400">
            {fmt(parseFloat(inputs.current_savings))} / {fmt(results.targetAmount)}
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-500"
            style={{ width: `${results.progressPct}%`, minWidth: results.progressPct > 0 ? '6px' : '0' }}
          />
        </div>
        <p className="text-sm text-gray-400 mt-2">{results.progressPct.toFixed(1)}% of your target</p>

        {/* Month presets */}
        <div className="mt-5">
          <p className="text-sm font-medium text-gray-600 mb-2">Common targets</p>
          <div className="flex gap-2 flex-wrap">
            {MONTH_PRESETS.map(m => (
              <button
                key={m}
                onClick={() => set('target_months')(m)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  parseInt(inputs.target_months) === m
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {m} months
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Your Expenses</h3>
          <div className="space-y-4">
            <NumInput label="Monthly Expenses"    prefix="$"   value={inputs.monthly_expenses}    onChange={set('monthly_expenses')}    min={0} />
            <NumInput label="Target Months"       suffix="mo"  value={inputs.target_months}       onChange={set('target_months')}       min={1} max={24} step={1} />
            <NumInput label="Current Savings"     prefix="$"   value={inputs.current_savings}     onChange={set('current_savings')}     min={0} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Building the Fund</h3>
          <div className="space-y-4">
            <NumInput label="Monthly Contribution" prefix="$" value={inputs.monthly_contribution} onChange={set('monthly_contribution')} min={0} />
            <NumInput label="Savings Interest Rate" suffix="%" hint="HYSA rate" value={inputs.interest_rate} onChange={set('interest_rate')} min={0} max={20} step={0.1} />
          </div>

          <div className="mt-5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-lg p-4">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Insight</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              {results.alreadyFunded ? (
                <>Your emergency fund is fully funded. Consider investing surplus savings for long-term growth.</>
              ) : (
                <>Save <strong className="text-gray-800">{fmt(parseFloat(inputs.monthly_contribution))}/month</strong> and
                   you'll reach your <strong className="text-gray-800">{fmt(results.targetAmount)}</strong> target
                   in <strong className="text-gray-800">{results.monthsToGoal} months</strong>.</>
              )}
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
