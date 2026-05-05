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

import { createApi, registerCsrfTokenGetter } from './httpClient'

const api = createApi('/api/auth')

// Module-level token store — only accessible within this module
let _csrfToken = null

export function getCsrfToken() {
  return _csrfToken
}

// Hand httpClient our getter so it can attach X-CSRF-Token automatically
// on every mutating request from any API module (auth, calculators, future
// modules). One-way dependency — httpClient never pulls auth state itself.
registerCsrfTokenGetter(getCsrfToken)

export const authApi = {
  // Fetch a CSRF token and store it in memory.
  // Awaited in App.jsx before rendering so the token is always ready.
  fetchCsrfToken: async () => {
    const { ok, data } = await api.get('/csrf-token')
    if (ok && data?.csrf_token) {
      _csrfToken = data.csrf_token
    }
  },

  register: (email, password) => api.post('/register', { email, password }),
  login:    (email, password) => api.post('/login',    { email, password }),
  logout:   ()                => api.post('/logout'),

  // Permanently deletes the account. Requires password confirmation.
  deleteAccount: (password) => api.delete('/account', { password }),

  getStatus: () => api.get('/status'),
}
