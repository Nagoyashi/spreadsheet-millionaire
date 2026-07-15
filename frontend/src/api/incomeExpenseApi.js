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

  // Monthly grid (bulk month entry): GET returns {cells, manual_sums}; PUT
  // replaces the month's aggregate rows wholesale (omitted cell = cleared).
  getMonth: (year, month) => api.get(`/months/${year}/${month}`),
  putMonth: (year, month, cells) => api.put(`/months/${year}/${month}`, { cells }),

  // Categories (user-scoped — v0.15.1; rename/reorder v0.15.2). POSTing a name
  // that matches an archived category restores it instead of duplicating.
  listCategories: () => api.get('/categories'),
  createCategory: (body) => api.post('/categories', body),
  patchCategory: (id, body) => api.patch(`/categories/${id}`, body), // {archived} and/or {name}
  reorderCategories: (type, ids) => api.put('/categories/order', { type, ids }),
}
