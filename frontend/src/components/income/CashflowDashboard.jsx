import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { fmt, fmtPct } from '../../utils/format'
import { categoryLabel } from './incomeExpenseOptions'

// Income & Expense Overview dashboard (recharts, already a dep): summary cards
// (with savings rate), a monthly income-vs-expense bar, and an expense-by-
// category pie — for the year selected via the page's filters.

const money = (n) => fmt(n, { compact: false })
const moneyCompact = (n) => fmt(n, { compact: true })

const INCOME_COLOR = '#10b981'
const EXPENSE_COLOR = '#ef4444'
const PIE_COLORS = [
  '#ef4444',
  '#f59e0b',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#6366f1',
  '#84cc16',
  '#a8a29e',
]

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

function StatCard({ label, value, tone = 'text-gray-800', sub }) {
  return (
    <div>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl sm:text-3xl font-bold ${tone}`}>{value}</p>
      {sub}
    </div>
  )
}

export default function CashflowDashboard({ summary, filters, setFilters }) {
  if (!summary) return null
  const { totals } = summary

  const savingsRate = totals.income > 0 ? (totals.net / totals.income) * 100 : null

  const monthlyData = summary.by_month.map((m) => ({
    name: MONTHS_SHORT[m.month - 1],
    income: m.income,
    expense: m.expense,
  }))

  const expenseByCategory = Object.entries(summary.by_category.expense)
    .map(([cat, value]) => ({ name: categoryLabel('expense', cat), value }))
    .sort((a, b) => b.value - a.value)

  const yearOptions = Array.from(new Set(summary.available_years)).sort((a, b) => b - a)

  return (
    <div className="space-y-6">
      {/* Summary + year selector */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-800">Cashflow — {summary.year}</h2>
          {yearOptions.length > 0 && (
            <select
              value={filters.year ?? summary.year}
              onChange={(e) => setFilters({ ...filters, year: Number(e.target.value) })}
              className="px-3 py-2 text-sm text-gray-800 bg-white rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Income" value={money(totals.income)} tone="text-emerald-600" />
          <StatCard label="Expenses" value={money(totals.expense)} tone="text-rose-600" />
          <StatCard
            label="Net"
            value={money(totals.net)}
            tone={totals.net >= 0 ? 'text-gray-800' : 'text-rose-600'}
          />
          <StatCard
            label="Savings rate"
            value={savingsRate != null ? fmtPct(savingsRate, { fromPercent: true }) : '—'}
            tone={savingsRate != null && savingsRate >= 0 ? 'text-emerald-600' : 'text-rose-600'}
          />
        </div>
      </div>

      {/* Monthly income vs expense + expense by category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Monthly income vs. expense</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
              <YAxis
                tickFormatter={moneyCompact}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                width={56}
              />
              <Tooltip formatter={(value) => money(value)} />
              <Legend />
              <Bar dataKey="income" name="Income" fill={INCOME_COLOR} />
              <Bar dataKey="expense" name="Expense" fill={EXPENSE_COLOR} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Spending by category</h3>
          {expenseByCategory.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-sm text-gray-500">
              No expenses recorded for {summary.year}.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={expenseByCategory}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                  >
                    {expenseByCategory.map((entry, i) => (
                      <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => money(value)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1.5">
                {expenseByCategory.map((entry, i) => (
                  <div key={entry.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center text-gray-700">
                      <span
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      {entry.name}
                    </span>
                    <span className="text-gray-600 font-medium">
                      {fmtPct((entry.value / totals.expense) * 100, { fromPercent: true })}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
