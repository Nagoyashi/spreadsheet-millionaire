// All Net Worth tracker API calls. No logic here — just HTTP.
//
// CSRF protection is handled centrally by httpClient via the token getter
// registered by authApi (hard rule #4 — no raw fetch in feature modules).
//
// The backend (routes/net_worth.py) returns {"items": [...]} for lists and
// {"item": {...}} for single rows; the hook unwraps those.

import { createApi } from './httpClient'

const api = createApi('/api/net-worth')

// Build the four identical CRUD facades (assets, liabilities, investments,
// real-estate) from one factory — same shape, different path.
function crud(path) {
  return {
    list: () => api.get(`/${path}`),
    create: (body) => api.post(`/${path}`, body),
    update: (id, body) => api.put(`/${path}/${id}`, body),
    remove: (id) => api.delete(`/${path}/${id}`),
  }
}

export const netWorthApi = {
  assets: crud('assets'),
  liabilities: crud('liabilities'),
  investments: crud('investments'),
  realEstate: crud('real-estate'),

  // GET /api/net-worth/summary — SQL-aggregated totals + category rollups
  getSummary: () => api.get('/summary'),

  snapshots: {
    list: () => api.get('/snapshots'),
    // Totals are computed server-side; the body is just an optional date + notes
    create: (body = {}) => api.post('/snapshots', body),
  },
}
