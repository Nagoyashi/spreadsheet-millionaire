// Shared HTTP client used by every API module.
//
// Centralises:
//   - JSON content-type + credentialed fetch
//   - CSRF header injection on mutating requests
//   - Uniform { ok, status, data } return shape
//   - 204 No Content handling
//   - Failure handling: request() NEVER rejects. Network errors, request
//     timeouts, and non-JSON bodies (e.g. a Vercel→Render 502 HTML page during
//     a Render cold start) all resolve to a uniform shape the UI can render,
//     instead of throwing and freezing the calling form. See describeError().
//
// Usage:
//   import { createApi, describeError } from './httpClient'
//   const api = createApi('/api/auth')
//   const { ok, data } = await api.get('/status')
//   const res = await api.post('/login', { email, password })
//   if (!res.ok) setError(describeError(res))   // never throws
//
// CSRF:
//   Tokens come from authApi's module-level store via getCsrfToken().
//   We import lazily (inside request()) to avoid a circular import:
//   httpClient must not pull in authApi at load time, since authApi
//   itself uses httpClient.

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

// Default per-request timeout. Render's free tier cold-starts in 30–60s; this
// bounds an otherwise-indefinite hang so a slow/unreachable backend surfaces a
// clear, retryable error instead of a permanently-spinning button. Production
// runs always-on, so this only bites a cold-starting free-tier backend, where a
// retry hits the now-warm instance. Override per call with options.timeout.
const DEFAULT_TIMEOUT_MS = 30_000

let _getCsrfToken = () => null
let _refreshCsrfToken = async () => {}
let _onUnauthorized = () => {}

// Called once by authApi at module load to register its token getter.
// Keeps the dependency one-way: httpClient knows nothing about auth state.
export function registerCsrfTokenGetter(fn) {
  _getCsrfToken = fn
}

// Re-fetch a fresh CSRF token (authApi registers its fetchCsrfToken). Used to
// self-heal a stale-token 403 — see the retry in request().
export function registerCsrfRefresher(fn) {
  _refreshCsrfToken = fn
}

// Called on a 401 from any non-auth endpoint (session expired/cleared server-
// side). useAuth registers a handler that resets the user to null so the app
// stops showing a logged-in state and prompts re-authentication.
export function registerUnauthorizedHandler(fn) {
  _onUnauthorized = fn
}

async function request(baseUrl, path, options = {}) {
  const { timeout = DEFAULT_TIMEOUT_MS, _retried, ...fetchOptions } = options
  const method   = (fetchOptions.method || 'GET').toUpperCase()
  const mutating = MUTATING_METHODS.has(method)
  const token    = mutating ? _getCsrfToken() : null
  const hasBody  = fetchOptions.body !== undefined && fetchOptions.body !== null

  const headers = {
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...(token   ? { 'X-CSRF-Token': token } : {}),
    ...fetchOptions.headers,
  }

  // Abort the request after `timeout` ms so a cold-starting or unreachable
  // backend fails fast instead of hanging forever (AbortController is built in —
  // no dependency). A custom signal in options would be overridden here; none of
  // our callers pass one today.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  let res
  try {
    res = await fetch(`${baseUrl}${path}`, {
      credentials: 'include',
      ...fetchOptions,
      headers,
      signal: controller.signal,
    })
  } catch (err) {
    // Network failure (offline/DNS), CORS rejection, or our own abort. Never
    // throw — return a uniform shape so the caller can show an error and
    // re-enable its form. status 0 = "the request never got a response".
    clearTimeout(timer)
    return { ok: false, status: 0, data: null, timedOut: err?.name === 'AbortError' }
  }
  clearTimeout(timer)

  // Guard JSON parsing: a non-2xx response is often a non-JSON body (a 502/504
  // HTML error page from the edge). Parsing that throws — so swallow it and
  // yield data:null rather than rejecting.
  let data = null
  if (res.status !== 204) {
    try {
      data = await res.json()
    } catch {
      data = null
    }
  }

  // Self-heal a stale/expired CSRF token (#22): the session's csrf_token is gone
  // (30-day expiry, Redis eviction, or a backend restart), so a mutating request
  // 403s with "Invalid or missing CSRF token." Re-fetch a fresh token and retry
  // the request ONCE, transparently — no manual page reload.
  if (
    mutating &&
    res.status === 403 &&
    !_retried &&
    /csrf/i.test(data?.error || '')
  ) {
    await _refreshCsrfToken()
    return request(baseUrl, path, { ...options, _retried: true })
  }

  // Session expired/cleared server-side (#21): a 401 from any non-auth endpoint
  // means the client's "logged in" state is stale. Reset it centrally so the UI
  // reflects logged-out and prompts re-auth, instead of every save/load failing
  // with a generic error. Auth-flow 401s (bad login) are excluded — they aren't
  // session expiry.
  if (res.status === 401 && !baseUrl.endsWith('/api/auth')) {
    _onUnauthorized()
  }

  return { ok: res.ok, status: res.status, data, timedOut: false }
}

// Map a failed request() result to a user-facing message. Lives here so the
// transport-error copy is defined once, not duplicated across every form.
// A backend-supplied JSON error (data.error) always wins; otherwise we
// synthesise from the transport signal (timeout / no-response / 5xx).
export function describeError(result, fallback = 'Something went wrong. Please try again.') {
  if (result?.data?.error) return result.data.error
  if (result?.timedOut) {
    return 'The server took too long to respond — it may be waking up. Please try again in a moment.'
  }
  if (result?.status === 0) {
    return "Couldn't reach the server. Check your connection and try again."
  }
  if (result?.status >= 500) {
    return 'The server is temporarily unavailable. Please try again in a moment.'
  }
  return fallback
}

// Factory — returns a small { get, post, put, patch, delete } facade bound to a
// baseUrl. Each verb just forwards into request() with the right method, so
// adding a new verb later means editing one place.
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
    patch:  (path, body, opts)   => request(baseUrl, path, { ...opts, method: 'PATCH',  body: bodyInit(body) }),
    delete: (path, body, opts)   => request(baseUrl, path, { ...opts, method: 'DELETE', body: bodyInit(body) }),
    // Escape hatch for unusual cases (e.g. query-string GETs); rarely needed.
    raw:    (path, opts)         => request(baseUrl, path, opts),
  }
}
