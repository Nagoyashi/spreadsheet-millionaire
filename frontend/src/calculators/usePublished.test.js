import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// usePublished fetches the runtime published set and falls back to the registry
// defaults. We mock calculatorApi so no network is involved, then assert the
// hook starts at the defaults and updates to the fetched set.
const getPublished = vi.fn()
vi.mock('../api/calculatorApi', () => ({
  calculatorApi: { getPublished: () => getPublished() },
}))

const { usePublishedTypes } = await import('./usePublished')
const { DEFAULT_PUBLISHED_TYPES } = await import('./registry')

describe('usePublishedTypes', () => {
  it('starts from the registry defaults, then adopts the fetched set', async () => {
    // Backend says fire + sankey are live (sankey is NOT a default) → proves the
    // runtime value wins over the build-time default.
    getPublished.mockResolvedValue({ ok: true, data: { published: ['fire', 'sankey'] } })

    const { result } = renderHook(() => usePublishedTypes())

    // First render: the optimistic build-time default.
    expect(result.current).toEqual(DEFAULT_PUBLISHED_TYPES)

    // After the fetch resolves: the runtime set.
    await waitFor(() => expect(result.current).toEqual(['fire', 'sankey']))
  })
})
