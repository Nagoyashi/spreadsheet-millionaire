// All auth API calls. No logic here — just HTTP.
//
// CSRF protection:
//   Call authApi.fetchCsrfToken() once on app load.
//   After that, every mutating request (POST/PUT/DELETE) automatically
//   includes the X-CSRF-Token header via the shared request() helper.

const BASE = '/api/auth'

// ─── CSRF cookie reader ───────────────────────────────────────────────────────
// The backend sets a non-HttpOnly 'csrf_token' cookie that JS can read.
// We attach its value as X-CSRF-Token on every mutating request.
function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

// ─── Shared fetch wrapper ─────────────────────────────────────────────────────
async function request(path, options = {}) {
  const method  = (options.method || 'GET').toUpperCase()
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

export const authApi = {
  // Fetch a fresh CSRF token from the server and store it in a cookie.
  // Call this once on app load before any mutating request.
  fetchCsrfToken: () => request('/csrf-token'),

  register: (email, password) =>
    request('/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: (email, password) =>
    request('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    request('/logout', { method: 'POST' }),

  getStatus: () =>
    request('/status'),
}
