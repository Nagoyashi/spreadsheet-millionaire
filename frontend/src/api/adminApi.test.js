import { describe, it, expect, vi, beforeEach } from 'vitest'

// Assert adminApi wires the right verb + path + body for each endpoint — the
// single source of the URLs the backend (routes/admin.py) serves.
const calls = []
vi.mock('./httpClient', () => ({
  createApi: () => ({
    get: (path) => (calls.push(['get', path]), Promise.resolve({ ok: true })),
    patch: (path, body) => (calls.push(['patch', path, body]), Promise.resolve({ ok: true })),
  }),
}))

const { adminApi } = await import('./adminApi')

beforeEach(() => {
  calls.length = 0
})

describe('adminApi', () => {
  it('GETs the calculator catalog', () => {
    adminApi.getCalculators()
    expect(calls).toEqual([['get', '/calculators']])
  })

  it('PATCHes a calculator publish flag', () => {
    adminApi.setPublished('fire', false)
    expect(calls).toEqual([['patch', '/calculators/fire', { published: false }]])
  })

  it('GETs users with no filters', () => {
    adminApi.getUsers()
    expect(calls).toEqual([['get', '/users']])
  })

  it('GETs users with search + tier filters', () => {
    adminApi.getUsers({ search: 'al ice', tier: 'pro' })
    expect(calls).toEqual([['get', '/users?search=al+ice&tier=pro']])
  })

  it('PATCHes a user tier / suspension', () => {
    adminApi.updateUser(7, { tier: 'elite' })
    expect(calls).toEqual([['patch', '/users/7', { tier: 'elite' }]])
  })

  it('GETs analytics for a range', () => {
    adminApi.getAnalytics('7d')
    expect(calls).toEqual([['get', '/analytics?range=7d']])
  })
})
