import { describe, it, expect, vi, beforeEach } from 'vitest'

// Record calls into the mocked httpClient so we can assert verb + path + body
// for each endpoint — the single source of those URLs the backend serves.
const calls = []
vi.mock('./httpClient', () => ({
  createApi: () => ({
    get: (path) => (calls.push(['get', path]), Promise.resolve({ ok: true })),
    post: (path, body) => (calls.push(['post', path, body]), Promise.resolve({ ok: true })),
    put: (path, body) => (calls.push(['put', path, body]), Promise.resolve({ ok: true })),
    delete: (path) => (calls.push(['delete', path]), Promise.resolve({ ok: true })),
  }),
}))

const { incomeExpenseApi } = await import('./incomeExpenseApi')

beforeEach(() => {
  calls.length = 0
})

describe('incomeExpenseApi', () => {
  it('listTransactions with no filters hits /transactions', async () => {
    await incomeExpenseApi.listTransactions()
    expect(calls).toEqual([['get', '/transactions']])
  })

  it('listTransactions builds a ?year=&month= query', async () => {
    await incomeExpenseApi.listTransactions({ year: 2026, month: 3 })
    expect(calls).toEqual([['get', '/transactions?year=2026&month=3']])
  })

  it('createTransaction POSTs the body to /transactions', async () => {
    const body = { type: 'expense', category: 'food', amount: 10, occurred_on: '2026-01-01' }
    await incomeExpenseApi.createTransaction(body)
    expect(calls).toEqual([['post', '/transactions', body]])
  })

  it('update/remove target /transactions/:id', async () => {
    await incomeExpenseApi.updateTransaction(5, { amount: 9 })
    await incomeExpenseApi.removeTransaction(5)
    expect(calls).toEqual([
      ['put', '/transactions/5', { amount: 9 }],
      ['delete', '/transactions/5'],
    ])
  })

  it('getSummary appends ?year= only when given', async () => {
    await incomeExpenseApi.getSummary()
    await incomeExpenseApi.getSummary(2025)
    expect(calls).toEqual([
      ['get', '/summary'],
      ['get', '/summary?year=2025'],
    ])
  })
})
