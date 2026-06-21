import { describe, it, expect, vi, beforeEach } from 'vitest'

// Record every call the api facade makes into the (mocked) httpClient, so we can
// assert netWorthApi wires the right verb + path + body for each endpoint —
// without a network. This is the single source of those URLs the backend
// (routes/net_worth.py) serves, so a typo here would surface as a test failure.
const calls = []
vi.mock('./httpClient', () => ({
  createApi: () => ({
    get: (path) => (calls.push(['get', path]), Promise.resolve({ ok: true })),
    post: (path, body) => (calls.push(['post', path, body]), Promise.resolve({ ok: true })),
    put: (path, body) => (calls.push(['put', path, body]), Promise.resolve({ ok: true })),
    delete: (path) => (calls.push(['delete', path]), Promise.resolve({ ok: true })),
  }),
}))

const { netWorthApi } = await import('./netWorthApi')

beforeEach(() => {
  calls.length = 0
})

describe('netWorthApi CRUD resources', () => {
  const cases = [
    ['assets', 'assets'],
    ['liabilities', 'liabilities'],
    ['investments', 'investments'],
    ['realEstate', 'real-estate'], // facade key -> URL segment
  ]

  it.each(cases)('%s.list -> GET /%s', async (key, path) => {
    await netWorthApi[key].list()
    expect(calls).toEqual([['get', `/${path}`]])
  })

  it.each(cases)('%s.create -> POST /%s with body', async (key, path) => {
    const body = { name: 'x' }
    await netWorthApi[key].create(body)
    expect(calls).toEqual([['post', `/${path}`, body]])
  })

  it.each(cases)('%s.update -> PUT /%s/:id with body', async (key, path) => {
    await netWorthApi[key].update(7, { name: 'y' })
    expect(calls).toEqual([['put', `/${path}/7`, { name: 'y' }]])
  })

  it.each(cases)('%s.remove -> DELETE /%s/:id', async (key, path) => {
    await netWorthApi[key].remove(7)
    expect(calls).toEqual([['delete', `/${path}/7`]])
  })
})

describe('netWorthApi summary + snapshots', () => {
  it('getSummary -> GET /summary', async () => {
    await netWorthApi.getSummary()
    expect(calls).toEqual([['get', '/summary']])
  })

  it('snapshots.list -> GET /snapshots', async () => {
    await netWorthApi.snapshots.list()
    expect(calls).toEqual([['get', '/snapshots']])
  })

  it('snapshots.create -> POST /snapshots, defaulting body to {}', async () => {
    await netWorthApi.snapshots.create()
    expect(calls).toEqual([['post', '/snapshots', {}]])
  })
})
