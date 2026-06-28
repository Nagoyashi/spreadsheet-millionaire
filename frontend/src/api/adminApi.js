// Admin portal API calls. No logic here — just HTTP.
//
// Every endpoint is admin-gated server-side (admin_required → 404 for
// non-admins); this client adds no gating of its own. CSRF is handled centrally
// by httpClient via authApi's token getter (hard rule #4 — no raw fetch).

import { createApi } from './httpClient'

const api = createApi('/api/admin')

export const adminApi = {
  // GET /api/admin/calculators — publish state per calc type (merged with the
  // registry's metadata on the client). Returns { calculators: [...] }.
  getCalculators: () => api.get('/calculators'),

  // PATCH /api/admin/calculators/:type { published } — flip one calculator's
  // published flag; takes effect on the public /app at runtime.
  setPublished: (calcType, published) =>
    api.patch(`/calculators/${calcType}`, { published }),

  // GET /api/admin/users?search=&tier= — accounts table + per-tier counts.
  getUsers: ({ search = '', tier = '' } = {}) => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (tier) params.set('tier', tier)
    const qs = params.toString()
    return api.get(qs ? `/users?${qs}` : '/users')
  },

  // PATCH /api/admin/users/:id { tier?, suspended? } — tier control +
  // suspend/reinstate (audit-logged server-side).
  updateUser: (id, fields) => api.patch(`/users/${id}`, fields),
}
