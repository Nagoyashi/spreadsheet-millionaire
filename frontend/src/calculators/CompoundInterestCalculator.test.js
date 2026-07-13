import { describe, it, expect } from 'vitest'
import { calculate } from './CompoundInterestCalculator'

const base = {
  version: 1,
  principal: 10000,
  monthly_contribution: 500,
  annual_rate: 7,
  years: 20,
  compound_frequency: 12,
}

describe('CompoundInterestCalculator frequency handling', () => {
  it('total contributed is the same regardless of compounding frequency', () => {
    const expected = 10000 + 500 * 12 * 20
    for (const n of [1, 4, 12, 365]) {
      expect(calculate({ ...base, compound_frequency: n }).totalContrib).toBe(expected)
    }
  })

  it('annual compounding matches the closed form (contributions spread per period)', () => {
    // n=1: 6000/yr → FV = 10000·1.07^20 + 6000·((1.07^20 − 1)/0.07)
    const fv = 10000 * Math.pow(1.07, 20) + 6000 * ((Math.pow(1.07, 20) - 1) / 0.07)
    expect(calculate({ ...base, compound_frequency: 1 }).totalValue).toBeCloseTo(fv, 4)
  })

  it('more frequent compounding grows more, but only slightly (same nominal rate)', () => {
    const annually = calculate({ ...base, compound_frequency: 1 }).totalValue
    const quarterly = calculate({ ...base, compound_frequency: 4 }).totalValue
    const monthly = calculate({ ...base, compound_frequency: 12 }).totalValue
    const daily = calculate({ ...base, compound_frequency: 365 }).totalValue
    expect(quarterly).toBeGreaterThan(annually)
    expect(monthly).toBeGreaterThan(quarterly)
    expect(daily).toBeGreaterThan(monthly)
    // The regression: daily used to contribute 500/day and explode to $242M.
    expect(daily).toBeLessThan(annually * 1.1)
  })

  it('interest earned is never negative at a positive rate', () => {
    for (const n of [1, 4, 12, 365]) {
      expect(calculate({ ...base, compound_frequency: n }).totalInterest).toBeGreaterThan(0)
    }
  })
})
