import { describe, it, expect } from 'vitest'
import { median, monthlyIncomeStats, categoryBreakdown, txnYearMonth } from './cashflowSelectors'

describe('median', () => {
  it('returns null for an empty list', () => {
    expect(median([])).toBeNull()
  })
  it('returns the middle value for odd counts', () => {
    expect(median([3, 1, 2])).toBe(2)
  })
  it('averages the two middles for even counts', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5)
  })
})

describe('monthlyIncomeStats', () => {
  const empty = () => Array.from({ length: 12 }, (_, i) => ({ month: i + 1, income: 0, expense: 0 }))

  it('returns nulls when no month has activity', () => {
    expect(monthlyIncomeStats(empty())).toEqual({ average: null, median: null, activeMonths: 0 })
  })

  it('summarises only over active months (income or expense present)', () => {
    const by = empty()
    by[0] = { month: 1, income: 5000, expense: 1000 } // active
    by[1] = { month: 2, income: 0, expense: 500 } // active, zero income
    // Month 3+ stay empty and must be ignored.
    const stats = monthlyIncomeStats(by)
    expect(stats.activeMonths).toBe(2)
    expect(stats.average).toBe(2500) // (5000 + 0) / 2
    expect(stats.median).toBe(2500) // median of [0, 5000]
  })

  it('average and median diverge when a one-off month skews the mean', () => {
    const by = empty()
    by[0] = { month: 1, income: 3000, expense: 0 }
    by[1] = { month: 2, income: 3000, expense: 0 }
    by[2] = { month: 3, income: 30000, expense: 0 } // bonus month
    const stats = monthlyIncomeStats(by)
    expect(stats.average).toBe(12000) // skewed high
    expect(stats.median).toBe(3000) // the honest typical month
  })
})

describe('categoryBreakdown', () => {
  const txns = [
    { type: 'expense', category: 'food', amount: 30, occurred_on: '2026-01-10' },
    { type: 'expense', category: 'food', amount: 20, occurred_on: '2026-01-20' },
    { type: 'expense', category: 'housing', amount: 100, occurred_on: '2026-02-01' },
    { type: 'income', category: 'salary', amount: 5000, occurred_on: '2026-01-25' },
    { type: 'expense', category: 'food', amount: 99, occurred_on: '2025-12-31' }, // other year
  ]

  it('aggregates and sorts expense categories for a year', () => {
    expect(categoryBreakdown(txns, { year: 2026, type: 'expense' })).toEqual([
      { category: 'housing', value: 100 },
      { category: 'food', value: 50 },
    ])
  })

  it('scopes to a single month', () => {
    expect(categoryBreakdown(txns, { year: 2026, month: 1, type: 'expense' })).toEqual([
      { category: 'food', value: 50 },
    ])
  })

  it('excludes other years', () => {
    const jan2025 = categoryBreakdown(txns, { year: 2025, type: 'expense' })
    expect(jan2025).toEqual([{ category: 'food', value: 99 }])
  })

  it('filters by type', () => {
    expect(categoryBreakdown(txns, { year: 2026, type: 'income' })).toEqual([
      { category: 'salary', value: 5000 },
    ])
  })
})

describe('txnYearMonth', () => {
  it('parses an ISO date without timezone drift', () => {
    expect(txnYearMonth('2026-03-15')).toEqual({ year: 2026, month: 3 })
  })
})
