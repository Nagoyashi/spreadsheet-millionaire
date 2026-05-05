// Shared HTTP client used by every API module.
//
// Centralises:
//   - JSON content-type + credentialed fetch
//   - CSRF header injection on mutating requests
//   - Uniform { ok, status, data } return shape
//   - 204 No Content handling
//
// Usage:
//   import { createApi } from './httpClient'
//   const api = createApi('/api/auth')
//   const { ok, data } = await api.get('/status')
//   const { ok, data } = await api.post('/login', { email, password })
//
// CSRF:
//   Tokens come from authApi's module-level store via getCsrfToken().
//   We import lazily (inside request()) to avoid a circular import:
//   httpClient must not pull in authApi at load time, since authApi
//   itself uses httpClient.

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

let _getCsrfToken = () => null

// Called once by authApi at module load to register its token getter.
// Keeps the dependency one-way: httpClient knows nothing about auth state.
export function registerCsrfTokenGetter(fn) {
  _getCsrfToken = fn
}

async function request(baseUrl, path, options = {}) {
  const method   = (options.method || 'GET').toUpperCase()
  const mutating = MUTATING_METHODS.has(method)
  const token    = mutating ? _getCsrfToken() : null
  const hasBody  = options.body !== undefined && options.body !== null

  const headers = {
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...(token   ? { 'X-CSRF-Token': token } : {}),
    ...options.headers,
  }

  const res  = await fetch(`${baseUrl}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  })
  const data = res.status === 204 ? null : await res.json()
  return { ok: res.ok, status: res.status, data }
}

// Factory — returns a small { get, post, put, delete } facade bound to a baseUrl.
// Each verb just forwards into request() with the right method, so adding a new
// verb later means editing one place.
//
// Body handling: only stringifies when an actual object/value is provided.
// Calling api.post('/logout') with no body sends a bodyless POST (not JSON "undefined").
function bodyInit(body) {
  return body === undefined ? undefined : JSON.stringify(body)
}

export function createApi(baseUrl) {
  return {
    get:    (path, opts)         => request(baseUrl, path, { ...opts, method: 'GET' }),
    post:   (path, body, opts)   => request(baseUrl, path, { ...opts, method: 'POST',   body: bodyInit(body) }),
    put:    (path, body, opts)   => request(baseUrl, path, { ...opts, method: 'PUT',    body: bodyInit(body) }),
    delete: (path, body, opts)   => request(baseUrl, path, { ...opts, method: 'DELETE', body: bodyInit(body) }),
    // Escape hatch for unusual cases (e.g. query-string GETs); rarely needed.
    raw:    (path, opts)         => request(baseUrl, path, opts),
  }
}
