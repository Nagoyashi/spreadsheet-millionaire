// Forecast projection for recurring transactions.
//
// A recurring transaction (recurrence_unit !== 'none') is projected forward to
// fill the EMPTY future months of the selected year, so those bars read as a
// forecast rather than blank. Projections are derived here at read time and are
// NEVER persisted — the table only ever holds real, dated transactions (see
// DECISIONS.md § "Income & Expense Tracker").

// Parse an ISO 'YYYY-MM-DD' as a UTC date (no timezone drift).
function parseUTC(iso) {
  const [y, m, d] = String(iso).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

// Hard cap on projected steps per rule — a backstop against a far-past anchor
// with a daily cadence (well above ~16 years of daily occurrences).
const SAFETY = 6000

// Month-bucketed occurrences for a MONTH/YEAR cadence, via month-index
// arithmetic so a month-end anchor (e.g. Jan 31) never rolls over and skips a
// month — only the month bucket matters here. Returns month numbers (1–12) for
// occurrences strictly after the anchor that land in `year`.
function monthlyBuckets(anchorIso, stepMonths, year) {
  const [ay, am] = String(anchorIso).split('-').map(Number) // am is 1–12
  const yearStart = year * 12
  const yearEnd = year * 12 + 11
  const months = []
  let idx = ay * 12 + (am - 1) + stepMonths // first occurrence after the anchor
  let guard = 0
  while (idx <= yearEnd && guard < SAFETY) {
    guard++
    if (idx >= yearStart) months.push((idx % 12) + 1)
    idx += stepMonths
  }
  return months
}

// Month-bucketed occurrences for a DAY/WEEK cadence, via real date stepping
// (the day determines which month a given occurrence falls in).
function dayBuckets(anchorIso, days, year) {
  const months = []
  const d = parseUTC(anchorIso)
  let guard = 0
  d.setUTCDate(d.getUTCDate() + days) // first occurrence after the anchor
  while (d.getUTCFullYear() <= year && guard < SAFETY) {
    guard++
    if (d.getUTCFullYear() === year) months.push(d.getUTCMonth() + 1)
    d.setUTCDate(d.getUTCDate() + days)
  }
  return months
}

// Month numbers (1–12, with repeats) of a rule's occurrences within `year`.
function occurrenceMonths(t, year) {
  const interval = Number(t.recurrence_interval) || 1
  switch (t.recurrence_unit) {
    case 'day':
      return dayBuckets(t.occurred_on, interval, year)
    case 'week':
      return dayBuckets(t.occurred_on, 7 * interval, year)
    case 'month':
      return monthlyBuckets(t.occurred_on, interval, year)
    case 'year':
      return monthlyBuckets(t.occurred_on, 12 * interval, year)
    default:
      return []
  }
}

// Projected occurrences (strictly after each rule's anchor) that land in EMPTY
// future months of `year`. "Empty future" = a month with no real transactions
// that is after the last month that does. Returns [{ month, type, amount }]. The
// anchor row itself is a real transaction, so it is never re-counted.
export function projectRecurring(transactions = [], year) {
  const actualMonths = new Set()
  for (const t of transactions) {
    const [y, m] = String(t.occurred_on).split('-').map(Number)
    if (y === year) actualMonths.add(m)
  }
  const lastActualMonth = actualMonths.size ? Math.max(...actualMonths) : 0

  const out = []
  for (const t of transactions) {
    const interval = Number(t.recurrence_interval) || 1
    if (!t.recurrence_unit || t.recurrence_unit === 'none' || interval < 1) continue
    for (const month of occurrenceMonths(t, year)) {
      if (month > lastActualMonth && !actualMonths.has(month)) {
        out.push({ month, type: t.type, amount: Number(t.amount) })
      }
    }
  }
  return out
}

// Per-month forecast totals for `year` (index 0 = January), summed from the
// projected occurrences. Months with no projection stay { income: 0, expense: 0 }.
export function forecastByMonth(transactions, year) {
  const months = Array.from({ length: 12 }, () => ({ income: 0, expense: 0 }))
  for (const f of projectRecurring(transactions, year)) {
    months[f.month - 1][f.type] += f.amount
  }
  return months
}

// Per-(type, category) recurring sums for ONE month — what the Monthly-entry
// grid shows read-only ("+ $X recurring") and fills via "Apply recurring".
// Counts each rule's occurrences that land in (year, month) STRICTLY AFTER its
// anchor date (the anchor row itself is a real transaction — its own month
// already carries it in the manual sums). Unlike projectRecurring, this does
// NOT skip months with real activity: the grid wants the expectation for the
// selected month regardless. Returns { income: {cat: sum}, expense: {...} }.
export function recurringByCategoryForMonth(transactions = [], year, month) {
  const out = { income: {}, expense: {} }
  for (const t of transactions) {
    const interval = Number(t.recurrence_interval) || 1
    if (!t.recurrence_unit || t.recurrence_unit === 'none' || interval < 1) continue
    const hits = occurrenceMonths(t, year).filter((m) => m === month).length
    if (!hits) continue
    out[t.type][t.category] = (out[t.type][t.category] ?? 0) + hits * Number(t.amount)
  }
  return out
}
