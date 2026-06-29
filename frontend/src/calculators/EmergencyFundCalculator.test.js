import { describe, it, expect } from 'vitest'
import { calculate } from './EmergencyFundCalculator'

const base = {
  version: 1,
  monthly_expenses: 2000,
  target_months: 6,
  current_savings: 0,
  monthly_contribution: 500,
  interest_rate: 4,
}

describe('EmergencyFund reachability (#33)', () => {
  it('reachable goal: reached=true with a finite month count', () => {
    const r = calculate(base)
    expect(r.reached).toBe(true)
    expect(r.monthsToGoal).toBeGreaterThan(0)
    expect(r.monthsToGoal).toBeLessThan(600)
  })

  it('no contribution + zero interest can never reach: reached=false (not the raw cap)', () => {
    const r = calculate({ ...base, monthly_contribution: 0, interest_rate: 0 })
    expect(r.reached).toBe(false)
  })

  it('already funded: reached=true, zero months', () => {
    const r = calculate({ ...base, current_savings: 999999 })
    expect(r.alreadyFunded).toBe(true)
    expect(r.reached).toBe(true)
    expect(r.monthsToGoal).toBe(0)
  })
})
