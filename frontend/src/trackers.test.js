import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// Tracker nav/card metadata must derive from upcomingFeatures.js (title, Icon,
// description) and from the runtime published set — never hand-written in a
// consumer (#286/#287). Mock the API so no network is involved.
const getPublished = vi.fn()
vi.mock('./api/calculatorApi', () => ({
  calculatorApi: { getPublished: () => getPublished() },
}))

const { useLiveTrackers, useVisibleUpcoming } = await import('./trackers')
const { invalidatePublished } = await import('./calculators/usePublished')
const { UPCOMING_MAP } = await import('./upcomingFeatures')

describe('trackers.js', () => {
  it('live trackers carry title, Icon and description from upcomingFeatures.js', async () => {
    getPublished.mockResolvedValue({
      ok: true,
      data: { published: ['net-worth', 'income-expenses'] },
    })
    const { result } = renderHook(() => useLiveTrackers())
    await waitFor(() => expect(result.current).toHaveLength(2))

    for (const t of result.current) {
      const src = UPCOMING_MAP[t.slug]
      expect(t.title).toBe(src.label)
      expect(t.Icon).toBe(src.Icon)
      expect(t.description).toBe(src.description)
      expect(t.description).toBeTruthy()
      expect(t.to).toBe(`/app/${t.slug}`)
    }
    // Each tracker describes itself — no card copy is shared/duplicated (#286).
    const descriptions = result.current.map((t) => t.description)
    expect(new Set(descriptions).size).toBe(descriptions.length)
  })

  it('an unpublished tracker leaves the live list and joins the upcoming teasers', async () => {
    getPublished.mockResolvedValue({ ok: true, data: { published: ['net-worth'] } })
    // The publish store is a module-level cache shared across consumers — force
    // the refetch exactly as an admin toggle would.
    await invalidatePublished()
    const live = renderHook(() => useLiveTrackers())
    const upcoming = renderHook(() => useVisibleUpcoming())
    await waitFor(() => expect(live.result.current.map((t) => t.slug)).toEqual(['net-worth']))
    await waitFor(() =>
      expect(upcoming.result.current.map((f) => f.slug)).toEqual(['income-expenses'])
    )
  })
})
