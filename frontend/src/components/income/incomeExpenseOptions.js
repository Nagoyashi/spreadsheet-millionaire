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

export function categoryLabel(type, value) {
  return CATEGORY_OPTIONS[type]?.find((o) => o.value === value)?.label ?? value
}
