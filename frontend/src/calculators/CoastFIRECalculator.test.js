import { describe, it, expect } from 'vitest'
import { calculate } from './CoastFIRECalculator'

const base = {
  version: 1,
  current_savings: 50000,
  annual_contribution: 15000,
  annual_expenses: 40000,
  current_age: 30,
  retirement_age: 65,
  expected_return: 7,
  withdrawal_rate: 4,
}

describe('CoastFIRECalculator rising coast threshold', () => {
  it('coast age crosses the threshold of that future year, not today’s', () => {
    // Threshold at year y is 1M/1.07^(35−y); balance grows 7% + 15k/yr.
    // First crossing is year 4 (balance ≈132k ≥ threshold ≈123k) — the old
    // static comparison against today’s 93.7k said year 3.
    const r = calculate(base)
    expect(r.yearsToCoast).toBe(4)
    expect(r.coastAge).toBe(34)
  })

  it('zero contributions below the coast number never coast (ratio is constant)', () => {
    const r = calculate({ ...base, annual_contribution: 0 })
    expect(r.yearsToCoast).toBeNull()
    expect(r.coastAge).toBeNull()
  })

  it('savings at/above the coast number coast immediately', () => {
    const r = calculate({ ...base, current_savings: 100000 })
    expect(r.hasCoasted).toBe(true)
    expect(r.yearsToCoast).toBe(0)
  })

  it('retirement age not in the future needs the full FIRE number', () => {
    const r = calculate({ ...base, current_age: 70 })
    expect(r.coastNumber).toBeCloseTo(r.fireNumber, 6)
  })
})
