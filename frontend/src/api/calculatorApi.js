// All calculator API calls. No logic here — just HTTP.
//
// CSRF protection:
//   The shared request() helper reads the csrf_token cookie (set by the backend
//   via /api/auth/csrf-token) and attaches it as X-CSRF-Token on all mutating
//   requests. No extra setup needed here — just ensure authApi.fetchCsrfToken()
//   has been called on app load.

const BASE = '/api/calculators'

// ─── CSRF cookie reader ───────────────────────────────────────────────────────
function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

// ─── Shared fetch wrapper ─────────────────────────────────────────────────────
async function request(path, options = {}) {
  const method   = (options.method || 'GET').toUpperCase()
  const mutating = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)

  const headers = {
    'Content-Type': 'application/json',
    ...(mutating && getCsrfToken() ? { 'X-CSRF-Token': getCsrfToken() } : {}),
    ...options.headers,
  }

  const res  = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  })
  const data = res.status === 204 ? null : await res.json()
  return { ok: res.ok, status: res.status, data }
}

export const calculatorApi = {
  // GET /api/calculators?type=fire  (type is optional)
  getAll: (type = null) => {
    const query = type ? `?type=${encodeURIComponent(type)}` : ''
    return request(query)
  },

  // POST /api/calculators
  create: (name, calcType, data) =>
    request('', {
      method: 'POST',
      body: JSON.stringify({ name, calc_type: calcType, data }),
    }),

  // PUT /api/calculators/<id>
  update: (id, fields) =>
    request(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(fields),
    }),

  // DELETE /api/calculators/<id>
  remove: (id) =>
    request(`/${id}`, { method: 'DELETE' }),
}
