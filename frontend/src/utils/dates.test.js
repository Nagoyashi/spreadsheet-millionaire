import { describe, it, expect } from 'vitest'
import { localIsoDate } from './dates'

describe('localIsoDate', () => {
  it('formats the LOCAL calendar date, zero-padded', () => {
    // Local-time constructor: 2026-07-14 01:00 wherever the test runs.
    expect(localIsoDate(new Date(2026, 6, 14, 1, 0, 0))).toBe('2026-07-14')
    expect(localIsoDate(new Date(2026, 0, 5, 23, 59, 59))).toBe('2026-01-05')
  })

  it('does not drift to the UTC date late in the evening (#285)', () => {
    // Pick a local instant whose UTC date may differ from its local date, and
    // assert we report the local one — not what toISOString() would say.
    const late = new Date(2026, 6, 13, 23, 30, 0)
    expect(localIsoDate(late)).toBe('2026-07-13')
  })

  it('defaults to now', () => {
    expect(localIsoDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
