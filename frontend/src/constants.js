// Shared localStorage / sessionStorage key generators.
// Single source of truth — import from here, never hardcode strings elsewhere.

// Persists calculator inputs across a login redirect
export const CALC_STORAGE_KEY = (type) => `fintrackr_calc_${type}`

// Per-user favourites — scoped by user ID so accounts don't share stars
export const FAVOURITES_KEY = (userId) => `fintrackr_favourites_${userId}`
