import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createApi,
  registerCsrfTokenGetter,
  registerCsrfRefresher,
  registerUnauthorizedHandler,
} from './httpClient'

// A minimal fetch Response stand-in.
function res(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

beforeEach(() => {
  // Reset the module-level hooks so tests don't leak handlers into each other.
  registerCsrfTokenGetter(() => 'tok')
  registerCsrfRefresher(async () => {})
  registerUnauthorizedHandler(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('httpClient — stale CSRF self-heal (#22)', () => {
  it('refreshes the token and retries once on a CSRF 403', async () => {
    const refresh = vi.fn(async () => {})
    registerCsrfRefresher(refresh)
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(res(403, { error: 'Invalid or missing CSRF token.' }))
      .mockResolvedValueOnce(res(201, { calculator: { id: 1 } }))
    vi.stubGlobal('fetch', fetchMock)

    const api = createApi('/api/calculators')
    const result = await api.post('', { x: 1 })

    expect(refresh).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.status).toBe(201)
  })

  it('does NOT retry a non-CSRF 403', async () => {
    const refresh = vi.fn(async () => {})
    registerCsrfRefresher(refresh)
    const fetchMock = vi.fn().mockResolvedValue(res(403, { error: 'Forbidden.' }))
    vi.stubGlobal('fetch', fetchMock)

    await createApi('/api/admin').patch('/users/1', { tier: 'pro' })

    expect(refresh).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('retries at most once (no infinite loop) if the 403 persists', async () => {
    registerCsrfRefresher(async () => {})
    const fetchMock = vi.fn().mockResolvedValue(res(403, { error: 'Invalid CSRF token.' }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await createApi('/api/calculators').post('', { x: 1 })

    expect(fetchMock).toHaveBeenCalledTimes(2) // original + one retry
    expect(result.status).toBe(403)
  })
})

describe('httpClient — central 401 handling (#21)', () => {
  it('fires the unauthorized handler on a 401 from a non-auth endpoint', async () => {
    const onUnauth = vi.fn()
    registerUnauthorizedHandler(onUnauth)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(401, { error: 'Authentication required.' })))

    await createApi('/api/calculators').get('')

    expect(onUnauth).toHaveBeenCalledTimes(1)
  })

  it('does NOT fire for an auth-endpoint 401 (bad login is not session expiry)', async () => {
    const onUnauth = vi.fn()
    registerUnauthorizedHandler(onUnauth)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(401, { error: 'Invalid email or password.' })))

    await createApi('/api/auth').post('/login', { email: 'x', password: 'y' })

    expect(onUnauth).not.toHaveBeenCalled()
  })
})
