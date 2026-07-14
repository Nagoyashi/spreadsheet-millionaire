import { describe, it, expect } from 'vitest'
import { projectRecurring, forecastByMonth } from './recurrence'

// Helper to build a transaction row.
const txn = (over) => ({
  type: 'income',
  amount: 1000,
  occurred_on: '2026-01-15',
  recurrence_unit: 'none',
  recurrence_interval: 1,
  ...over,
})

describe('projectRecurring', () => {
  // Regression (#294): monthly-grid aggregate rows are one-offs (recurrence
  // 'none') — never projected, but their month counts as real activity, so the
  // forecast doesn't overwrite a bulk-entered month.
  it('never projects a monthly-grid aggregate row, and its month counts as actual', () => {
    const rows = [
      txn({ occurred_on: '2026-06-01', source: 'monthly', type: 'expense' }),
      txn({ occurred_on: '2026-01-15', recurrence_unit: 'month' }),
    ]
    const months = projectRecurring(rows, 2026).map((p) => p.month)
    expect(months).not.toContain(6) // June has real (bulk-entered) activity
    expect(months).toContain(7) // later empty months still forecast
  })

  it('ignores one-off transactions', () => {
    expect(projectRecurring([txn({ recurrence_unit: 'none' })], 2026)).toEqual([])
  })

  it('projects a monthly rule into the empty future months only', () => {
    // Salary anchored Jan; an actual expense in Feb. Empty months Mar–Dec fill.
    const txns = [
      txn({ type: 'income', amount: 5000, occurred_on: '2026-01-31', recurrence_unit: 'month' }),
      txn({ type: 'expense', amount: 200, occurred_on: '2026-02-10', recurrence_unit: 'none' }),
    ]
    const months = projectRecurring(txns, 2026).map((f) => f.month)
    // lastActualMonth = 2 (Feb), so forecasts are Mar..Dec = 10 occurrences.
    expect(months).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })

  it('handles a custom interval (every 2 months)', () => {
    const txns = [
      txn({ occurred_on: '2026-01-10', recurrence_unit: 'month', recurrence_interval: 2 }),
    ]
    // Anchor Jan (actual) → Mar, May, Jul, Sep, Nov. lastActualMonth = 1.
    expect(projectRecurring(txns, 2026).map((f) => f.month)).toEqual([3, 5, 7, 9, 11])
  })

  it('projects weekly cadence into months and buckets by month', () => {
    const txns = [txn({ occurred_on: '2026-01-05', recurrence_unit: 'week' })]
    const fc = forecastByMonth(txns, 2026)
    // Jan has the anchor (an actual), so it's excluded; later months accumulate
    // ~4–5 weekly occurrences each.
    expect(fc[0].income).toBe(0) // January excluded (anchor month)
    expect(fc[1].income).toBeGreaterThan(0) // February has weekly projections
  })

  it('does not project into a month that already has real activity', () => {
    const txns = [
      txn({ type: 'income', amount: 5000, occurred_on: '2026-01-31', recurrence_unit: 'month' }),
      txn({ type: 'expense', amount: 9, occurred_on: '2026-06-01', recurrence_unit: 'none' }),
    ]
    const months = projectRecurring(txns, 2026).map((f) => f.month)
    // June has real activity AND is not after the last actual month (June),
    // so only Jul–Dec forecast.
    expect(months).toEqual([7, 8, 9, 10, 11, 12])
  })

  it('only counts occurrences within the requested year', () => {
    const txns = [txn({ occurred_on: '2026-11-15', recurrence_unit: 'month' })]
    // Dec is the only same-year future occurrence; Jan 2027+ are out of scope.
    expect(projectRecurring(txns, 2026).map((f) => f.month)).toEqual([12])
  })
})

describe('forecastByMonth', () => {
  it('sums projected amounts per month and type', () => {
    const txns = [
      txn({ type: 'income', amount: 5000, occurred_on: '2026-01-31', recurrence_unit: 'month' }),
    ]
    const fc = forecastByMonth(txns, 2026)
    expect(fc).toHaveLength(12)
    expect(fc[1]).toEqual({ income: 5000, expense: 0 }) // February
    expect(fc[0]).toEqual({ income: 0, expense: 0 }) // January (anchor month, excluded)
  })
})
