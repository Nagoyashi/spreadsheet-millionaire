import { describe, it, expect } from 'vitest'
import {
  assetGain,
  investmentGain,
  propertyGain,
  debtToAssetRatio,
  snapshotDelta,
  liabilitiesBreakdown,
} from './overviewSelectors'

describe('per-item gain helpers', () => {
  it('assetGain = current_value − cost_basis', () => {
    expect(assetGain({ current_value: 5000, cost_basis: 3000 })).toBe(2000)
    expect(assetGain({ current_value: 1000, cost_basis: 0 })).toBe(1000) // basis defaults to 0
  })

  it('investmentGain uses market value, else falls back to quantity × unit cost', () => {
    // Explicit market value present.
    expect(investmentGain({ quantity: 10, cost_basis: 100, current_value: 1500 })).toBe(500)
    // No market value (0) → falls back to quantity*cost, gain 0 (matches the backend CASE).
    expect(investmentGain({ quantity: 10, cost_basis: 100, current_value: 0 })).toBe(0)
  })

  it('propertyGain = current_value − purchase_price (mortgage ignored)', () => {
    expect(propertyGain({ current_value: 400000, purchase_price: 350000, mortgage_balance: 200000 }))
      .toBe(50000)
  })

  it('per-item gains sum to the aggregate lifetime gain', () => {
    const assets = [
      { current_value: 5000, cost_basis: 3000 }, // +2000
      { current_value: 3000, cost_basis: 3500 }, // -500
    ]
    const investments = [{ quantity: 10, cost_basis: 100, current_value: 1500 }] // +500
    const properties = [{ current_value: 400000, purchase_price: 356500 }] // +43500
    const total =
      assets.reduce((s, a) => s + assetGain(a), 0) +
      investments.reduce((s, i) => s + investmentGain(i), 0) +
      properties.reduce((s, p) => s + propertyGain(p), 0)
    expect(total).toBe(45500)
  })
})

describe('debtToAssetRatio', () => {
  it('is liabilities / assets as a percent', () => {
    expect(debtToAssetRatio({ total_assets: 636500, total_liabilities: 313200 })).toBeCloseTo(49.21, 1)
  })
  it('is null when there are no assets', () => {
    expect(debtToAssetRatio({ total_assets: 0, total_liabilities: 100 })).toBeNull()
    expect(debtToAssetRatio(null)).toBeNull()
  })
})

describe('snapshotDelta', () => {
  it('is null with fewer than two snapshots', () => {
    expect(snapshotDelta([])).toBeNull()
    expect(snapshotDelta([{ net_worth: 100 }])).toBeNull()
  })
  it('is the change between the two most recent (list is date-ascending)', () => {
    const snaps = [
      { net_worth: 100000 },
      { net_worth: 120000 },
      { net_worth: 132400 },
    ]
    expect(snapshotDelta(snaps)).toBe(12400)
  })
  it('is negative when net worth fell', () => {
    expect(snapshotDelta([{ net_worth: 50000 }, { net_worth: 45000 }])).toBe(-5000)
  })
})

describe('liabilitiesBreakdown', () => {
  it('groups by liability_type and adds a mortgages slice from properties', () => {
    const liabilities = [
      { liability_type: 'credit_card', current_balance: 2000 },
      { liability_type: 'credit_card', current_balance: 1000 },
      { liability_type: 'loan', current_balance: 10000 },
    ]
    const properties = [
      { mortgage_balance: 300000 },
      { mortgage_balance: 200 },
    ]
    const out = liabilitiesBreakdown(liabilities, properties)
    expect(out).toEqual([
      { key: 'mortgages', label: 'Mortgages', value: 300200 },
      { key: 'loan', label: 'Loans', value: 10000 },
      { key: 'credit_card', label: 'Credit cards', value: 3000 },
    ])
    // Reconciles with total_liabilities (explicit + mortgages).
    expect(out.reduce((s, p) => s + p.value, 0)).toBe(313200)
  })

  it('omits a mortgages slice when there are none, and zero slices', () => {
    const out = liabilitiesBreakdown([{ liability_type: 'loan', current_balance: 500 }], [])
    expect(out).toEqual([{ key: 'loan', label: 'Loans', value: 500 }])
  })

  it('is empty when there are no liabilities or mortgages', () => {
    expect(liabilitiesBreakdown([], [])).toEqual([])
  })
})
