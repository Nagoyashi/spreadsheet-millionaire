import { describe, it, expect } from 'vitest'
import { normalizeSlices } from './SankeyDiagram'

describe('Sankey normalizeSlices (#24)', () => {
  it('gives a group missing its items array an empty items array (no crash)', () => {
    // The exact crafted payload from the issue.
    const out = normalizeSlices({ income_sources: [], expense_groups: [{ label: 'x' }] })
    expect(Array.isArray(out.expense_groups[0].items)).toBe(true)
    expect(out.expense_groups[0].items).toEqual([])
    // Renderer code (g.items.reduce/filter) is now safe:
    expect(() => out.expense_groups.forEach(g => g.items.reduce((s) => s, 0))).not.toThrow()
  })

  it('falls back to defaults when a field is not an array', () => {
    const out = normalizeSlices({ income_sources: 'nope', expense_groups: null })
    expect(out.income_sources.length).toBeGreaterThan(0)
    expect(out.expense_groups.length).toBeGreaterThan(0)
    expect(out.expense_groups.every(g => Array.isArray(g.items))).toBe(true)
  })

  it('preserves well-formed entries and normalizes item values', () => {
    const out = normalizeSlices({
      income_sources: [{ id: 'a', label: 'Salary', value: '4200' }],
      expense_groups: [{ id: 'g', label: 'Housing', items: [{ id: 'r', label: 'Rent', value: 1450 }, 'garbage'] }],
    })
    expect(out.income_sources).toEqual([{ id: 'a', label: 'Salary', value: 4200 }])
    expect(out.expense_groups[0].items).toEqual([{ id: 'r', label: 'Rent', value: 1450 }])
  })

  it('handles a totally non-object input without throwing', () => {
    const out = normalizeSlices(null)
    expect(out.expense_groups.every(g => Array.isArray(g.items))).toBe(true)
  })
})
