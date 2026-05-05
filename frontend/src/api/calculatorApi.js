// All calculator API calls. No logic here — just HTTP.
//
// CSRF protection is handled centrally by httpClient via the token getter
// registered by authApi. We don't need to import or read the token here.

import { createApi } from './httpClient'

const api = createApi('/api/calculators')

export const calculatorApi = {
  // GET /api/calculators?type=fire  (type is optional)
  getAll: (type = null) => {
    const query = type ? `?type=${encodeURIComponent(type)}` : ''
    return api.get(query)
  },

  // POST /api/calculators
  create: (name, calcType, data) =>
    api.post('', { name, calc_type: calcType, data }),

  // PUT /api/calculators/<id>
  update: (id, fields) =>
    api.put(`/${id}`, fields),

  // DELETE /api/calculators/<id>
  remove: (id) =>
    api.delete(`/${id}`),
}
