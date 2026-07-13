import { describe, it, expect } from 'vitest'
import { calculate } from './WithdrawalPlanCalculator'

const base = {
  version: 1,
  portfolio_value: 1000000,
  annual_withdrawal: 40000,
  expected_return: 5,
  inflation_rate: 2.5,
  years: 30,
}

describe('WithdrawalPlanCalculator horizon reporting', () => {
  it('real return is a percentage, not a fraction', () => {
    expect(calculate(base).realReturnPct).toBeCloseTo(2.5, 10)
    expect(calculate({ ...base, expected_return: 8, inflation_rate: 0 }).realReturnPct).toBeCloseTo(
      8,
      10
    )
  })

  it('balance at the horizon is the year-N balance, not the end of the 50y sim', () => {
    // No withdrawals: after 30 years the balance is exactly 1M·1.05^30.
    const r = calculate({ ...base, annual_withdrawal: 0 })
    expect(r.balanceAtHorizon).toBeCloseTo(1000000 * Math.pow(1.05, 30), 4)
    expect(r.depletionYear).toBeNull()
    expect(r.survivesHorizon).toBe(true)
  })

  it('depletion beyond the horizon still reports a positive horizon balance', () => {
    // Defaults deplete after ~41 years — beyond the 30-year horizon.
    const r = calculate(base)
    expect(r.depletionYear).toBeGreaterThan(30)
    expect(r.survivesHorizon).toBe(true)
    expect(r.balanceAtHorizon).toBeGreaterThan(0)
  })

  it('depletion within the horizon reports $0 and unsustainable', () => {
    const r = calculate({ ...base, annual_withdrawal: 200000 })
    expect(r.depletionYear).toBeLessThanOrEqual(30)
    expect(r.survivesHorizon).toBe(false)
    expect(r.balanceAtHorizon).toBe(0)
  })
})
