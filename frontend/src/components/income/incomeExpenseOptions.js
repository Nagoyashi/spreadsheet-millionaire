// Income & Expense option lists for the UI.
//
// The enum *values* MUST mirror backend/income_expense_types.py (the backend
// CHECK + per-type Marshmallow validation reject anything else). Labels are
// UI-only. Frontend mirror, like wealth/categories.js mirrors net_worth_types.py.

export const TYPE_OPTIONS = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
]

// Category options keyed by transaction type (the form swaps these when the
// type changes).
export const CATEGORY_OPTIONS = {
  expense: [
    { value: 'housing', label: 'Housing' },
    { value: 'food', label: 'Food' },
    { value: 'transport', label: 'Transport' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'health', label: 'Health' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'shopping', label: 'Shopping' },
    { value: 'savings', label: 'Savings' },
    { value: 'other', label: 'Other' },
  ],
  income: [
    { value: 'salary', label: 'Salary' },
    { value: 'freelance', label: 'Freelance' },
    { value: 'investment', label: 'Investment' },
    { value: 'gift', label: 'Gift' },
    { value: 'refund', label: 'Refund' },
    { value: 'other', label: 'Other' },
  ],
}

// Since v0.15.1 categories are user-scoped (GET /categories: {id, type, key,
// name, archived}). The static CATEGORY_OPTIONS above is the DEFAULT set —
// what the backend seeds a new user with, and the render fallback until the
// fetch resolves. Pass the fetched list to the helpers below where available.

// Active (non-archived) options per type, shaped like CATEGORY_OPTIONS.
export function activeCategoryOptions(categories) {
  if (!categories?.length) return CATEGORY_OPTIONS
  const opts = { expense: [], income: [] }
  for (const c of categories) {
    if (!c.archived && opts[c.type]) opts[c.type].push({ value: c.key, label: c.name })
  }
  return opts
}

export function categoryLabel(type, value, categories) {
  // The user's own category name wins (archived included — history keeps its
  // label); fall back to the default set, then to the raw key.
  const hit = categories?.find((c) => c.type === type && c.key === value)
  if (hit) return hit.name
  return CATEGORY_OPTIONS[type]?.find((o) => o.value === value)?.label ?? value
}

// Month display names, indexed 0–11 (calendar month − 1). Shared by the
// Transactions filter bar and the Monthly-entry grid.
export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

// Recurrence — mirrors backend RECURRENCE_UNITS. A repeat is (unit, interval):
// e.g. ('week', 2) = "Every 2 weeks". 'none' = a one-off.
export const RECURRENCE_UNIT_OPTIONS = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
]

const RECURRENCE_ADVERB = { day: 'Daily', week: 'Weekly', month: 'Monthly', year: 'Yearly' }
const RECURRENCE_NOUN = { day: 'days', week: 'weeks', month: 'months', year: 'years' }

// Human label for a (unit, interval) pair: 'Monthly', 'Every 2 weeks', '' for none.
export function recurrenceLabel(unit, interval = 1) {
  if (!unit || unit === 'none') return ''
  const n = Number(interval) || 1
  if (n === 1) return RECURRENCE_ADVERB[unit] ?? unit
  return `Every ${n} ${RECURRENCE_NOUN[unit] ?? unit}`
}
