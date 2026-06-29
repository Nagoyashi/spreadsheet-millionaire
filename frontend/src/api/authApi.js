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

import { createApi, registerCsrfTokenGetter, registerCsrfRefresher } from './httpClient'

const api = createApi('/api/auth')

// Module-level token store — only accessible within this module
let _csrfToken = null

export function getCsrfToken() {
  return _csrfToken
}

// Re-fetch + store a fresh CSRF token. Awaited in App.jsx on mount, and used by
// httpClient to self-heal a stale-token 403.
async function fetchCsrfToken() {
  const { ok, data } = await api.get('/csrf-token')
  if (ok && data?.csrf_token) {
    _csrfToken = data.csrf_token
  }
}

// Hand httpClient our getter (so it attaches X-CSRF-Token automatically on every
// mutating request) and our refresher (so it can re-fetch a fresh token and retry
// once on a stale-token 403). One-way dependency — httpClient never pulls auth
// state itself.
registerCsrfTokenGetter(getCsrfToken)
registerCsrfRefresher(fetchCsrfToken)

export const authApi = {
  // Fetch a CSRF token and store it in memory. Awaited in App.jsx on mount.
  fetchCsrfToken,

  register: (email, password) => api.post('/register', { email, password }),
  login:    (email, password) => api.post('/login',    { email, password }),
  logout:   ()                => api.post('/logout'),

  // Permanently deletes the account. Requires password confirmation.
  deleteAccount: (password) => api.delete('/account', { password }),

  // Password reset (anonymous). forgotPassword always resolves with the same
  // neutral message regardless of whether the email is registered.
  forgotPassword: (email)            => api.post('/forgot-password', { email }),
  resetPassword:  (token, password)  => api.post('/reset-password',  { token, password }),

  // Account management (authenticated).
  changePassword: (current_password, new_password) =>
    api.post('/change-password', { current_password, new_password }),
  changeEmail:    (password, new_email) =>
    api.post('/change-email', { password, new_email }),

  getStatus: () => api.get('/status'),
}
