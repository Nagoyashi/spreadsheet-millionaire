import { describe, it, expect } from 'vitest'
import { calculate } from './FIRECalculator'

const base = {
  version: 1,
  annual_income: 80000,
  annual_expenses: 40000,
  savings_rate: 50,
  current_savings: 0,
  expected_return: 7,
  withdrawal_rate: 4,
}

describe('FIRECalculator years to FIRE', () => {
  it('baseline: 40k/yr at 7% reaches the 1M target in 15 years', () => {
    expect(calculate(base).yearsToFire).toBe(15)
  })

  it('unreachable (no savings, no portfolio) is null, not 0', () => {
    expect(calculate({ ...base, savings_rate: 0 }).yearsToFire).toBeNull()
  })

  it('growth alone can reach the target without contributions', () => {
    // 500k doubling to 1M at 7% takes 11 years.
    const r = calculate({ ...base, savings_rate: 0, current_savings: 500000 })
    expect(r.yearsToFire).toBe(11)
  })

  it('already at the target is 0 years', () => {
    expect(calculate({ ...base, current_savings: 2000000 }).yearsToFire).toBe(0)
  })
})
