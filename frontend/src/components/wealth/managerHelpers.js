// Pure helpers for CategoryManager — kept separate so they're unit-testable
// without rendering. No React here.

import { fmt, fmtPct } from '../../utils/format'

// Build the API payload from form state. Number fields are coerced from the
// string NumInput holds; empty/null fields are omitted so the backend applies
// its column defaults (cost_basis 0, notes NULL, …) rather than receiving "".
// `fixed` injects non-form values (e.g. Collectibles force asset_type:'custom').
export function buildPayload(fields, form, fixed = {}) {
  const out = { ...fixed }
  for (const f of fields) {
    const v = form[f.name]
    if (v === '' || v == null) continue
    out[f.name] = f.type === 'number' ? Number(v) : v
  }
  return out
}

// A submit is allowed only when every required field has a non-empty value.
export function canSubmit(fields, form) {
  return fields.every((f) => !f.required || (form[f.name] !== '' && form[f.name] != null))
}

// Seed form state: required selects default to their first option (so the form
// is valid immediately); everything else starts empty.
export function initialForm(fields) {
  const out = {}
  for (const f of fields) {
    out[f.name] = f.type === 'select' && f.required ? f.options[0].value : ''
  }
  return out
}

// Populate form state from an existing row for editing (numbers -> strings for
// the controlled inputs; missing values -> '').
export function formFromRow(fields, row) {
  const out = {}
  for (const f of fields) {
    const v = row[f.name]
    out[f.name] = v == null ? '' : String(v)
  }
  return out
}

// Resolve a column's value for a row. A `derive(row)` column computes its value
// from the row (e.g. gain/loss from current_value − cost_basis); a plain column
// reads `row[col.key]`.
export function deriveCell(col, row) {
  return typeof col.derive === 'function' ? col.derive(row) : row[col.key]
}

// Render one table cell value by its declared format.
export function formatCell(value, format, options) {
  if (value == null || value === '') return '—'
  switch (format) {
    case 'money':
      return fmt(Number(value), { compact: false })
    case 'gainloss': {
      // Signed money — fmt() already prefixes '-' for negatives; add '+' for gains.
      const n = Number(value)
      return `${n > 0 ? '+' : ''}${fmt(n, { compact: false })}`
    }
    case 'percent':
      return fmtPct(Number(value), { fromPercent: true })
    case 'enum':
      return options?.find((o) => o.value === value)?.label ?? value
    default:
      return String(value)
  }
}

// Tailwind tone for a signed gain/loss number.
export function gainTone(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n === 0) return 'text-gray-500'
  return n > 0 ? 'text-green-600' : 'text-red-600'
}
