// All Income & Expense tracker API calls. No logic here — just HTTP.
//
// CSRF handled centrally by httpClient (hard rule #4 — no raw fetch). The
// backend returns {"items": [...]} for lists and {"item": {...}} for single rows.

import { createApi } from './httpClient'

const api = createApi('/api/income-expense')

// Build a ?year=&month= query string from optional filters.
function query({ year, month } = {}) {
  const params = new URLSearchParams()
  if (year != null) params.set('year', year)
  if (month != null) params.set('month', month)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export const incomeExpenseApi = {
  // GET /api/income-expense/transactions?year=&month=
  listTransactions: (filters) => api.get(`/transactions${query(filters)}`),
  createTransaction: (body) => api.post('/transactions', body),
  updateTransaction: (id, body) => api.put(`/transactions/${id}`, body),
  removeTransaction: (id) => api.delete(`/transactions/${id}`),

  // GET /api/income-expense/summary?year=
  getSummary: (year) => api.get(`/summary${year != null ? `?year=${year}` : ''}`),
}
