// Shared localStorage / sessionStorage key generators.
// Single source of truth — import from here, never hardcode strings elsewhere.

// Persists calculator inputs across a login redirect
export const CALC_STORAGE_KEY = (type) => `sm_calc_${type}`

// Per-user favourites — scoped by user ID so accounts don't share stars
export const FAVOURITES_KEY = (userId) => `sm_favourites_${userId}`

// Analytics funnel (#177): the session counter (drives second_session) and the
// one-shot guards for "first time ever" milestones (e.g. tracker_first_entry).
export const ANALYTICS_SESSION_KEY = 'sm_analytics_session'
export const ANALYTICS_ONCE_KEY = (name) => `sm_analytics_once_${name}`
