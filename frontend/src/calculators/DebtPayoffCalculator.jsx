import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { CreditCard, TrendingDown, Calendar, DollarSign, Plus, Trash2 } from 'lucide-react'
import StatCard from '../components/ui/StatCard'
import NumInput from '../components/ui/NumInput'
import { useCalculatorInputs } from '../hooks/useCalculatorInputs'
import { fmt } from '../utils/format'

const DEFAULTS = {
  version: 1,
  extra_payment: 200,
  debts: [
    { id: 1, name: 'Credit Card', balance: 5000, rate: 19.99, minimum: 100 },
    { id: 2, name: 'Car Loan',    balance: 12000, rate: 6.5,  minimum: 250 },
    { id: 3, name: 'Student Loan', balance: 20000, rate: 4.5, minimum: 200 },
  ],
}

function simulate(debts, extraPayment, strategy) {
  // strategy: 'avalanche' (highest rate first) | 'snowball' (lowest balance first)
  let remaining = debts.map(d => ({ ...d, balance: parseFloat(d.balance) || 0 }))
  const totalMinimum = remaining.reduce((s, d) => s + (parseFloat(d.minimum) || 0), 0)
  const monthlyBudget = totalMinimum + (parseFloat(extraPayment) || 0)

  let months = 0
  let totalInterest = 0

  while (remaining.some(d => d.balance > 0) && months < 600) {
    // Sort by strategy each month
    const order = [...remaining]
      .filter(d => d.balance > 0)
      .sort((a, b) =>
        strategy === 'avalanche'
          ? b.rate - a.rate
          : a.balance - b.balance
      )

    let budgetLeft = monthlyBudget

    // Pay minimums first
    remaining = remaining.map(d => {
      if (d.balance <= 0) return d
      const interest = d.balance * (d.rate / 100 / 12)
      totalInterest += interest
      const min = Math.min(parseFloat(d.minimum) || 0, d.balance + interest)
      budgetLeft -= min
      return { ...d, balance: Math.max(0, d.balance + interest - min) }
    })

    // Apply extra to priority debt
    for (const priority of order) {
      if (budgetLeft <= 0) break
      const debt = remaining.find(d => d.id === priority.id)
      if (!debt || debt.balance <= 0) continue
      const payment = Math.min(budgetLeft, debt.balance)
      debt.balance = Math.max(0, debt.balance - payment)
      budgetLeft -= payment
    }

    months++
    if (months > 600) break
  }

  return { months, totalInterest }
}

function calculate(inputs) {
  const validDebts = inputs.debts.filter(d => parseFloat(d.balance) > 0)
  if (validDebts.length === 0) return null

  const avalanche = simulate(validDebts, inputs.extra_payment, 'avalanche')
  const snowball  = simulate(validDebts, inputs.extra_payment, 'snowball')
  const totalDebt = validDebts.reduce((s, d) => s + (parseFloat(d.balance) || 0), 0)
  const interestSaved = snowball.totalInterest - avalanche.totalInterest
  const monthsSaved   = snowball.months - avalanche.months

  const chartData = validDebts.map(d => ({
    name: d.name,
    balance: parseFloat(d.balance) || 0,
    rate: parseFloat(d.rate) || 0,
  }))

  return { avalanche, snowball, totalDebt, interestSaved, monthsSaved, chartData }
}

export default function DebtPayoffCalculator({ initialData, onDataChange }) {
  // setInputs is exposed alongside set() for the array operations below
  // (add/remove/update debt) which need to mutate a nested array.
  const { inputs, setInputs } = useCalculatorInputs({
    defaults: DEFAULTS,
    initialData,
    onDataChange,
    calcType: 'debt_payoff',
  })

  const results = calculate(inputs)

  function addDebt() {
    setInputs(prev => ({
      ...prev,
      debts: [...prev.debts, { id: Date.now(), name: 'New Debt', balance: 0, rate: 0, minimum: 0 }],
    }))
  }

  function removeDebt(id) {
    setInputs(prev => ({ ...prev, debts: prev.debts.filter(d => d.id !== id) }))
  }

  function updateDebt(id, field, value) {
    setInputs(prev => ({
      ...prev,
      debts: prev.debts.map(d => d.id === id ? { ...d, [field]: value } : d),
    }))
  }

  if (!results) return (
    <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-400 text-sm">
      Add at least one debt with a balance to see results.
    </div>
  )

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Debt"
          value={fmt(results.totalDebt)}
          sub="Current balance"
          Icon={CreditCard}
          iconClass="text-red-500"
          gradientClass="from-red-500 to-rose-600"
        />
        <StatCard
          label="Avalanche Time"
          value={`${results.avalanche.months} mo`}
          sub={`${fmt(results.avalanche.totalInterest)} interest`}
          Icon={TrendingDown}
          iconClass="text-emerald-500"
          gradientClass="from-emerald-500 to-teal-600"
        />
        <StatCard
          label="Snowball Time"
          value={`${results.snowball.months} mo`}
          sub={`${fmt(results.snowball.totalInterest)} interest`}
          Icon={Calendar}
          iconClass="text-blue-500"
          gradientClass="from-blue-500 to-indigo-600"
        />
        <StatCard
          label="Interest Saved"
          value={fmt(Math.abs(results.interestSaved))}
          sub={results.interestSaved > 0 ? 'Avalanche wins' : results.interestSaved < 0 ? 'Snowball wins' : 'Same result'}
          Icon={DollarSign}
          iconClass="text-amber-500"
          gradientClass="from-amber-400 to-orange-500"
        />
      </div>

      {/* Strategy comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <h3 className="text-xl font-bold text-gray-800">Avalanche Method</h3>
          </div>
          <p className="text-sm text-gray-400 mb-4">Highest interest rate first — minimises total interest paid</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Payoff time</span>
              <span className="font-semibold text-gray-800">{results.avalanche.months} months ({(results.avalanche.months / 12).toFixed(1)} yrs)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total interest</span>
              <span className="font-semibold text-red-600">{fmt(results.avalanche.totalInterest)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <h3 className="text-xl font-bold text-gray-800">Snowball Method</h3>
          </div>
          <p className="text-sm text-gray-400 mb-4">Smallest balance first — psychological wins, keeps momentum</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Payoff time</span>
              <span className="font-semibold text-gray-800">{results.snowball.months} months ({(results.snowball.months / 12).toFixed(1)} yrs)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total interest</span>
              <span className="font-semibold text-red-600">{fmt(results.snowball.totalInterest)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Debt balances chart */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Debt Balances</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={results.chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} width={54} />
            <Tooltip formatter={(v) => fmt(v)} />
            <Bar dataKey="balance" name="Balance" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Debt inputs */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800">Your Debts</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600">Extra monthly payment</label>
              <div className="w-28">
                <NumInput
                  prefix="$"
                  value={inputs.extra_payment}
                  onChange={v => setInputs(prev => ({ ...prev, extra_payment: v }))}
                  min={0}
                />
              </div>
            </div>
            <button
              onClick={addDebt}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Add Debt
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Name</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Balance</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Interest Rate</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Min Payment</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {inputs.debts.map(debt => (
                <tr key={debt.id}>
                  <td className="py-2 pr-3">
                    <input
                      type="text"
                      value={debt.name}
                      onChange={e => updateDebt(debt.id, 'name', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <NumInput prefix="$" value={debt.balance} onChange={v => updateDebt(debt.id, 'balance', v)} min={0} />
                  </td>
                  <td className="py-2 pr-3">
                    <NumInput suffix="%" value={debt.rate} onChange={v => updateDebt(debt.id, 'rate', v)} min={0} max={100} step={0.1} />
                  </td>
                  <td className="py-2 pr-3">
                    <NumInput prefix="$" value={debt.minimum} onChange={v => updateDebt(debt.id, 'minimum', v)} min={0} />
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => removeDebt(debt.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
