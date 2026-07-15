import { useState } from 'react'
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
import { monthlyTypeStats, categoryBreakdown } from './cashflowSelectors'
import { forecastByMonth } from './recurrence'

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

function StatCard({ label, value, tone = 'text-gray-800', sub, action }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2">
        <p className="text-sm text-gray-500">{label}</p>
        {action}
      </div>
      <p className={`text-2xl sm:text-3xl font-bold ${tone}`}>{value}</p>
      {sub}
    </div>
  )
}

// Tiny two-option segmented control, styled to match the year <select>.
function Segmented({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-xs">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-2 py-1 font-medium transition ${
            value === o.value
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function CashflowDashboard({
  summary,
  transactions = [],
  categories,
  filters,
  setFilters,
}) {
  const [monthStat, setMonthStat] = useState('average') // 'average' | 'median'
  const [categoryMonth, setCategoryMonth] = useState(null) // null = full year, else 1–12
  const [pieType, setPieType] = useState('expense') // 'expense' | 'income'

  if (!summary) return null
  const { totals } = summary
  const year = summary.year

  const savingsRate = totals.income > 0 ? (totals.net / totals.income) * 100 : null

  // Per-month income AND expenses, summarised (average vs median) over the same
  // active-month set — one toggle drives both cards so they stay comparable
  // (pre-v0.15.2 only income was per-month, next to a year-total Expenses).
  const incomeStats = monthlyTypeStats(summary.by_month, 'income')
  const expenseStats = monthlyTypeStats(summary.by_month, 'expense')
  const perMonthIncome = monthStat === 'average' ? incomeStats.average : incomeStats.median
  const perMonthExpense = monthStat === 'average' ? expenseStats.average : expenseStats.median

  // Forecast: recurring transactions projected into the empty future months of
  // the year (read-side only — nothing persisted). An empty month with a
  // projection renders as a lighter "forecast" bar.
  const forecast = forecastByMonth(transactions, year)
  const monthlyData = summary.by_month.map((m, i) => {
    const fc = forecast[i]
    const isForecast = m.income === 0 && m.expense === 0 && (fc.income > 0 || fc.expense > 0)
    return {
      name: MONTHS_SHORT[m.month - 1],
      income: isForecast ? fc.income : m.income,
      expense: isForecast ? fc.expense : m.expense,
      forecast: isForecast,
    }
  })
  const hasForecast = monthlyData.some((m) => m.forecast)

  // Category pie (income OR expense via the card's toggle) — full year reads
  // the year-complete summary; a specific month re-slices the transaction list
  // (the /summary endpoint is year-scoped only).
  const pieByCategory = (
    categoryMonth == null
      ? Object.entries(summary.by_category[pieType]).map(([category, value]) => ({
          category,
          value,
        }))
      : categoryBreakdown(transactions, { year, month: categoryMonth, type: pieType })
  )
    .map(({ category, value }) => ({ name: categoryLabel(pieType, category, categories), value }))
    .sort((a, b) => b.value - a.value)

  const categoryTotal = pieByCategory.reduce((sum, e) => sum + e.value, 0)
  const categoryScopeLabel =
    categoryMonth == null ? year : `${MONTHS_SHORT[categoryMonth - 1]} ${year}`

  // A selected month can LOOK filled on the bar chart while holding no recorded
  // rows — forecast bars are projections from recurring transactions, and
  // projections are never transactions. Say so instead of a bare "no data".
  const selectedMonthIsForecastOnly =
    categoryMonth != null &&
    summary.by_month[categoryMonth - 1]?.income === 0 &&
    summary.by_month[categoryMonth - 1]?.expense === 0 &&
    (forecast[categoryMonth - 1]?.income > 0 || forecast[categoryMonth - 1]?.expense > 0)

  // Selectable years: any year with data PLUS a window around today — with data
  // in only one year the selector used to offer nothing to switch to, which
  // read as "can't select the year" (and back-filling needs empty years too).
  const currentYear = new Date().getFullYear()
  const yearWindow = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i)
  const yearOptions = Array.from(new Set([...summary.available_years, ...yearWindow])).sort(
    (a, b) => b - a
  )

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
          <StatCard
            label="Income / month"
            value={perMonthIncome != null ? money(perMonthIncome) : '—'}
            tone="text-emerald-600"
            action={
              <Segmented
                options={[
                  { value: 'average', label: 'Avg' },
                  { value: 'median', label: 'Median' },
                ]}
                value={monthStat}
                onChange={setMonthStat}
              />
            }
            sub={
              <p className="text-xs text-gray-400 mt-1">
                {money(totals.income)} total in {year}
              </p>
            }
          />
          <StatCard
            label="Expenses / month"
            value={perMonthExpense != null ? money(perMonthExpense) : '—'}
            tone="text-rose-600"
            sub={
              <p className="text-xs text-gray-400 mt-1">
                {money(totals.expense)} total in {year}
              </p>
            }
          />
          <StatCard
            label={`Net — ${year}`}
            value={money(totals.net)}
            tone={totals.net >= 0 ? 'text-gray-800' : 'text-rose-600'}
            sub={<p className="text-xs text-gray-400 mt-1">income − expenses, full year</p>}
          />
          <StatCard
            label={`Savings rate — ${year}`}
            value={savingsRate != null ? fmtPct(savingsRate, { fromPercent: true }) : '—'}
            tone={savingsRate != null && savingsRate >= 0 ? 'text-emerald-600' : 'text-rose-600'}
            sub={<p className="text-xs text-gray-400 mt-1">net ÷ income, full year</p>}
          />
        </div>
      </div>

      {/* Monthly income vs expense + expense by category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Monthly income vs. expense</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={monthlyData}
              margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              onClick={(state) => {
                // recharts may deliver the index as a string — coerce before
                // arithmetic, or "0" + 1 becomes "01" and the slice goes empty.
                const idx = Number(state?.activeTooltipIndex)
                if (!Number.isInteger(idx) || idx < 0 || idx > 11) return
                setCategoryMonth((cur) => (cur === idx + 1 ? null : idx + 1))
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
              <YAxis
                tickFormatter={moneyCompact}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                width={56}
              />
              <Tooltip
                formatter={(value, name, item) => [
                  money(value),
                  item?.payload?.forecast ? `${name} (forecast)` : name,
                ]}
              />
              <Legend />
              <Bar dataKey="income" name="Income" fill={INCOME_COLOR}>
                {monthlyData.map((d, i) => (
                  <Cell key={`inc-${i}`} fill={INCOME_COLOR} fillOpacity={d.forecast ? 0.4 : 1} />
                ))}
              </Bar>
              <Bar dataKey="expense" name="Expense" fill={EXPENSE_COLOR}>
                {monthlyData.map((d, i) => (
                  <Cell key={`exp-${i}`} fill={EXPENSE_COLOR} fillOpacity={d.forecast ? 0.4 : 1} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-gray-400">
            Tip: click a month to scope the category breakdown.
            {hasForecast && ' Lighter bars are projected from recurring transactions.'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <h3 className="text-lg font-bold text-gray-800">
              {pieType === 'expense' ? 'Spending by category' : 'Income by category'}
            </h3>
            <div className="flex items-center gap-2">
              <Segmented
                options={[
                  { value: 'expense', label: 'Expenses' },
                  { value: 'income', label: 'Income' },
                ]}
                value={pieType}
                onChange={setPieType}
              />
              <select
                value={categoryMonth ?? ''}
                onChange={(e) => setCategoryMonth(e.target.value ? Number(e.target.value) : null)}
                className="px-2.5 py-1.5 text-xs text-gray-800 bg-white rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Full year</option>
                {MONTHS_SHORT.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {pieByCategory.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-center text-sm text-gray-500 px-6">
              {selectedMonthIsForecastOnly
                ? `${categoryScopeLabel} has no recorded transactions yet — its bars on the chart are projections from your recurring transactions.`
                : `No ${pieType === 'expense' ? 'expenses' : 'income'} recorded for ${categoryScopeLabel}.`}
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieByCategory}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                  >
                    {pieByCategory.map((entry, i) => (
                      <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => money(value)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1.5">
                {pieByCategory.map((entry, i) => (
                  <div key={entry.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center text-gray-700">
                      <span
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      {entry.name}
                    </span>
                    <span className="text-gray-600 font-medium">
                      {fmtPct((entry.value / categoryTotal) * 100, { fromPercent: true })}
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
