import { describe, it, expect } from 'vitest'
import { calculate } from './MortgageCalculator'

const base = {
  version: 1,
  home_price: 400000,
  down_payment: 80000,
  loan_term: 30,
  annual_rate: 6.5,
  property_tax_rate: 1.2,
  insurance_monthly: 150,
}

describe('MortgageCalculator loan clamping', () => {
  it('baseline P&I matches the standard amortisation formula', () => {
    const r = 0.065 / 12
    const pi = (320000 * (r * Math.pow(1 + r, 360))) / (Math.pow(1 + r, 360) - 1)
    expect(calculate(base).monthlyMortgage).toBeCloseTo(pi, 6)
  })

  it('a down payment above the price means no loan, never a negative payment', () => {
    const r = calculate({ ...base, down_payment: 500000 })
    expect(r.principal).toBe(0)
    expect(r.monthlyMortgage).toBe(0)
    expect(r.totalInterest).toBe(0)
  })
})
