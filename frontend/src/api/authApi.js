// All auth API calls. No logic here — just HTTP.
// credentials: 'include' is required on every call so the session cookie
// travels with the request even though frontend (5173) and backend (5000)
// are different origins during development.

const BASE = '/api/auth'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  })
  const data = res.status === 204 ? null : await res.json()
  return { ok: res.ok, status: res.status, data }
}

export const authApi = {
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
