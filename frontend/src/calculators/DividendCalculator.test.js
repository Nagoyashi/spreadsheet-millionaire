import { describe, it, expect } from 'vitest'
import { calculate } from './DividendCalculator'

const base = {
  version: 1,
  portfolio_value: 100000,
  dividend_yield: 4,
  dividend_growth: 0,
  annual_contribution: 0,
  years: 10,
  tax_rate: 0,
}

describe('DividendCalculator projection (#77)', () => {
  it('applies dividend growth — higher growth yields higher final income', () => {
    const flat = calculate({ ...base, dividend_growth: 0 })
    const grown = calculate({ ...base, dividend_growth: 8 })
    expect(grown.finalAnnualIncome).toBeGreaterThan(flat.finalAnnualIncome)
  })

  it('growth = 0 keeps the yield constant (income tracks only portfolio growth)', () => {
    const r = calculate({ ...base, dividend_growth: 0 })
    // Year 0: 100000 * 4% = 4000
    expect(r.chartData[0].annualIncome).toBe(4000)
    // Year 1 portfolio reinvests the dividend: 100000 + 4000 = 104000
    expect(r.chartData[1].portfolio).toBe(104000)
    // Year 1 income at the same 4% yield: 104000 * 4% = 4160
    expect(r.chartData[1].annualIncome).toBe(4160)
  })

  it('growth compounds the yield (year-1 income reflects the grown yield)', () => {
    const r = calculate({ ...base, dividend_growth: 10 })
    // Year 1 portfolio: 100000 + 4000 = 104000; yield grew 4% → 4.4%.
    // Income = 104000 * 4.4% = 4576.
    expect(r.chartData[1].annualIncome).toBe(4576)
  })
})
