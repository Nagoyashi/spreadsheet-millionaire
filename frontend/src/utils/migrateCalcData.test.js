import { describe, it, expect, vi } from 'vitest'

import { migrate, stripVersion, injectVersion, VERSION_KEY } from './migrateCalcData'

// VERSION_KEY is '__v' — assert it so a rename can't silently break saved data.
describe('VERSION_KEY', () => {
  it('is the documented __v marker', () => {
    expect(VERSION_KEY).toBe('__v')
  })
})

describe('migrate — sankey v1 → v2', () => {
  const flatV1 = () => ({
    income_sources: [{ id: 'inc1', label: 'Salary', value: 5000 }],
    expense_categories: [
      { id: 'e1', label: 'Rent', value: 1500 },
      { id: 'e2', label: 'Food', value: 600 },
    ],
  })

  it('wraps flat expense_categories into one expense_groups entry, preserving every item', () => {
    const out = migrate('sankey', flatV1(), 2)

    expect(out.expense_categories).toBeUndefined()
    expect(out.expense_groups).toEqual([
      {
        id: 'group_expenses',
        label: 'Expenses',
        items: [
          { id: 'e1', label: 'Rent', value: 1500 },
          { id: 'e2', label: 'Food', value: 600 },
        ],
      },
    ])
  })

  it('preserves unrelated fields and stamps the version', () => {
    const out = migrate('sankey', flatV1(), 2)
    expect(out.income_sources).toEqual([{ id: 'inc1', label: 'Salary', value: 5000 }])
    expect(out[VERSION_KEY]).toBe(2)
  })

  it('does not mutate the input', () => {
    const input = flatV1()
    migrate('sankey', input, 2)
    expect(input.expense_categories).toHaveLength(2)
    expect(input.expense_groups).toBeUndefined()
    expect(input[VERSION_KEY]).toBeUndefined()
  })

  it('is idempotent — re-running on the v2 result changes nothing', () => {
    const once = migrate('sankey', flatV1(), 2)
    const twice = migrate('sankey', once, 2)
    expect(twice).toEqual(once)
  })

  it('does not double-wrap a v2-shaped record that lacks a version marker', () => {
    const v2Shape = {
      expense_groups: [
        { id: 'group_expenses', label: 'Expenses', items: [{ id: 'e1', label: 'Rent', value: 1500 }] },
      ],
    }
    const out = migrate('sankey', v2Shape, 2)
    expect(out.expense_groups).toEqual(v2Shape.expense_groups)
    expect(out.expense_categories).toBeUndefined()
    expect(out[VERSION_KEY]).toBe(2)
  })

  it('treats a record with no missing categories as an empty group', () => {
    const out = migrate('sankey', { income_sources: [] }, 2)
    expect(out.expense_groups).toEqual([
      { id: 'group_expenses', label: 'Expenses', items: [] },
    ])
  })
})

describe('migrate — version handling', () => {
  it('treats a legacy record without __v as v1', () => {
    // No __v + target v2 → the v1→v2 sankey step runs, proving fromVersion was 1.
    const out = migrate('sankey', { expense_categories: [{ id: 'e1', label: 'Rent', value: 1500 }] }, 2)
    expect(out.expense_groups).toBeDefined()
    expect(out[VERSION_KEY]).toBe(2)
  })

  it('returns data as-is (no downgrade) and warns when stored version > client version', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const future = { [VERSION_KEY]: 5, secret_field: 'keep', expense_categories: [{ id: 'e1' }] }

    const out = migrate('sankey', future, 2)

    // No migration step ran — the future-shaped fields are untouched (not reshaped).
    expect(out.secret_field).toBe('keep')
    expect(out.expense_categories).toEqual([{ id: 'e1' }])
    expect(out.expense_groups).toBeUndefined()
    // Version is normalised to the client version; the data is not downgraded.
    expect(out[VERSION_KEY]).toBe(2)
    expect(warnSpy).toHaveBeenCalledTimes(1)

    warnSpy.mockRestore()
  })

  it('treats a missing intermediate migration step as a no-op version bump', () => {
    // 'fire' has no registered migrations: v1 → v3 just stamps the version.
    const out = migrate('fire', { savings_rate: 0.25 }, 3)
    expect(out).toEqual({ savings_rate: 0.25, [VERSION_KEY]: 3 })
  })

  it('applies present steps and skips missing ones across a multi-version jump', () => {
    // sankey has step 2 but no step 3: v1 → v3 wraps (step 2) then bumps to v3.
    const out = migrate('sankey', { expense_categories: [{ id: 'e1', label: 'Rent', value: 1500 }] }, 3)
    expect(out.expense_groups).toBeDefined()
    expect(out.expense_categories).toBeUndefined()
    expect(out[VERSION_KEY]).toBe(3)
  })

  it('stamps the version when stored equals current (no-op)', () => {
    const out = migrate('fire', { [VERSION_KEY]: 2, a: 1 }, 2)
    expect(out).toEqual({ [VERSION_KEY]: 2, a: 1 })
  })

  it('returns non-object input unchanged', () => {
    expect(migrate('fire', null, 1)).toBe(null)
    expect(migrate('fire', undefined, 1)).toBe(undefined)
    expect(migrate('fire', 42, 1)).toBe(42)
  })
})

describe('stripVersion', () => {
  it('removes the __v field', () => {
    expect(stripVersion({ [VERSION_KEY]: 2, a: 1, b: 2 })).toEqual({ a: 1, b: 2 })
  })

  it('leaves data without __v unchanged', () => {
    expect(stripVersion({ a: 1 })).toEqual({ a: 1 })
  })

  it('handles non-object input', () => {
    expect(stripVersion(null)).toBe(null)
    expect(stripVersion(undefined)).toBe(undefined)
    expect(stripVersion(42)).toBe(42)
    expect(stripVersion('str')).toBe('str')
  })
})

describe('injectVersion', () => {
  it('adds __v defaulting to 1 when absent', () => {
    expect(injectVersion({ a: 1 })).toEqual({ a: 1, [VERSION_KEY]: 1 })
  })

  it('adds a custom version when absent', () => {
    expect(injectVersion({ a: 1 }, 3)).toEqual({ a: 1, [VERSION_KEY]: 3 })
  })

  it('does not overwrite an existing __v', () => {
    expect(injectVersion({ a: 1, [VERSION_KEY]: 2 })).toEqual({ a: 1, [VERSION_KEY]: 2 })
    expect(injectVersion({ a: 1, [VERSION_KEY]: 2 }, 5)).toEqual({ a: 1, [VERSION_KEY]: 2 })
  })

  it('handles non-object input', () => {
    expect(injectVersion(null)).toBe(null)
    expect(injectVersion(undefined)).toBe(undefined)
    expect(injectVersion(99)).toBe(99)
  })
})

describe('migrate + stripVersion + injectVersion round-trip', () => {
  it('mirrors the load → save → load cycle without data loss', () => {
    // Load a legacy flat sankey record: inject v1, migrate to v2.
    const stored = { expense_categories: [{ id: 'e1', label: 'Rent', value: 1500 }] }
    const loaded = migrate('sankey', injectVersion(stored), 2)
    expect(loaded.expense_groups).toBeDefined()

    // Save: strip the version marker (backend stores only inputs).
    const toSave = stripVersion(loaded)
    expect(toSave[VERSION_KEY]).toBeUndefined()
    expect(toSave.expense_groups).toBeDefined()

    // Re-load: inject the stored version (now v2) and migrate again — idempotent.
    const reloaded = migrate('sankey', injectVersion(toSave, 2), 2)
    expect(reloaded).toEqual(loaded)
  })
})
