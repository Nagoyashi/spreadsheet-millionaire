// Pure derivation helpers for the Income & Expense Overview.
//
// All month/year slicing of the cashflow data lives here (one source of truth),
// so CashflowDashboard stays presentational. Everything derives from data the
// page already holds — the year `summary` and the transaction list — with no
// backend or schema change (the /summary endpoint is year-scoped only).

// occurred_on is an ISO date string 'YYYY-MM-DD'; parse without timezone drift.
export function txnYearMonth(occurredOn) {
  const [year, month] = String(occurredOn).split('-').map(Number)
  return { year, month }
}

export function median(values) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

// Per-month stats for one type ('income' | 'expense'), summarised over the
// months that have any recorded activity (income OR expense) — so trailing
// empty/future months don't drag a partial year toward zero. Median is the more
// honest "typical month" than the mean when a few big one-off months skew the
// average. Both stat cards share the same active-month set, so income and
// expense per-month figures stay comparable.
export function monthlyTypeStats(byMonth = [], type = 'income') {
  const active = byMonth.filter((m) => m.income > 0 || m.expense > 0)
  if (!active.length) return { average: null, median: null, activeMonths: 0 }
  const values = active.map((m) => m[type])
  const average = values.reduce((sum, n) => sum + n, 0) / values.length
  return { average, median: median(values), activeMonths: active.length }
}

// Back-compat name (pre-v0.15.2 the Overview only summarised income).
export function monthlyIncomeStats(byMonth = []) {
  return monthlyTypeStats(byMonth, 'income')
}

// Category totals for one type ('expense' | 'income'), scoped to a year and
// optionally a single month, derived from the raw transaction list. Returns
// [{ category, value }] sorted high→low. When `month` is null the caller should
// prefer the year-complete `summary.by_category` instead (this still works, but
// depends on the transaction list being year-complete).
export function categoryBreakdown(transactions = [], { year, month = null, type = 'expense' }) {
  const totals = new Map()
  for (const t of transactions) {
    if (t.type !== type) continue
    const ym = txnYearMonth(t.occurred_on)
    if (year != null && ym.year !== year) continue
    if (month != null && ym.month !== month) continue
    totals.set(t.category, (totals.get(t.category) ?? 0) + Number(t.amount))
  }
  return [...totals.entries()]
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value)
}
