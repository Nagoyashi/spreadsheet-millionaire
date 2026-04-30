// All auth API calls. No logic here — just HTTP.
//
// CSRF protection:
//   The backend issues a token via GET /api/auth/csrf-token.
//   We store it in memory (module-level variable) and attach it as
//   X-CSRF-Token on every mutating request.
//
//   Memory storage is intentional — it survives the session but not a
//   full page reload, which is fine because fetchCsrfToken() is called
//   on every app mount. It also means an attacker's page can never read
//   it (no cookie, no localStorage — just a JS variable in our module).

const BASE = '/api/auth'

// Module-level token store — only accessible within this module
let _csrfToken = null

export function getCsrfToken() {
  return _csrfToken
}

// ─── Shared fetch wrapper ─────────────────────────────────────────────────────
async function request(path, options = {}) {
  const method   = (options.method || 'GET').toUpperCase()
  const mutating = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)

  const headers = {
    'Content-Type': 'application/json',
    ...(mutating && _csrfToken ? { 'X-CSRF-Token': _csrfToken } : {}),
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
  // Fetch a CSRF token and store it in memory.
  // Awaited in App.jsx before rendering so the token is always ready.
  fetchCsrfToken: async () => {
    const { ok, data } = await request('/csrf-token')
    if (ok && data?.csrf_token) {
      _csrfToken = data.csrf_token
    }
  },

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
