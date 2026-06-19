import { describe, it, expect } from 'vitest'

import { fmt } from './format'

describe('fmt', () => {
  it('compacts millions with the M suffix', () => {
    expect(fmt(1_500_000)).toBe('$1.50M')
  })

  it('compacts thousands with the K suffix', () => {
    expect(fmt(2_500)).toBe('$2.5K')
  })

  it('leaves small values uncompacted', () => {
    expect(fmt(42)).toBe('$42')
  })

  it('honours a custom currency symbol', () => {
    expect(fmt(1_500, { currency: '€' })).toBe('€1.5K')
  })

  it('renders full digits with grouping when compact is off', () => {
    expect(fmt(2_500, { compact: false })).toBe('$2,500')
  })

  it('falls back to a zero string for non-finite input', () => {
    expect(fmt(NaN)).toBe('$0')
    expect(fmt(Infinity)).toBe('$0')
  })

  it('caps finite-but-extreme magnitudes at the display ceiling', () => {
    expect(fmt(1e15)).toBe('$999T+')
  })
})
