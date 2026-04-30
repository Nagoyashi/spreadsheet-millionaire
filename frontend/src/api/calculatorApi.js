// All calculator API calls. No logic here — just HTTP.
//
// CSRF protection:
//   getCsrfToken() reads from the in-memory token stored by authApi.
//   Attached as X-CSRF-Token on all mutating requests automatically.

import { getCsrfToken } from './authApi'

const BASE = '/api/calculators'

async function request(path, options = {}) {
  const method   = (options.method || 'GET').toUpperCase()
  const mutating = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)
  const token    = getCsrfToken()

  const headers = {
    'Content-Type': 'application/json',
    ...(mutating && token ? { 'X-CSRF-Token': token } : {}),
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
