// All calculator API calls. No logic here — just HTTP.

const BASE = '/api/calculators'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  })
  const data = res.status === 204 ? null : await res.json()
  return { ok: res.ok, status: res.status, data }
}

export const calculatorApi = {
  // GET /api/calculators?type=fire  (type is optional)
  getAll: (type = null) => {
    const query = type ? `?type=${type}` : ''
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
      body: JSON.stringify(fields),  // { name?, data? } — both optional
    }),

  // DELETE /api/calculators/<id>
  remove: (id) =>
    request(`/${id}`, { method: 'DELETE' }),
}
