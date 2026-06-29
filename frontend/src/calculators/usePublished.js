// Runtime publish surface — the single source of truth for which calculators
// the public app shows. Publish state is DB-backed and admin-toggleable, so this
// fetches /api/calculators/published once and shares it across every consumer
// (sidebar nav, landing grid, marketing showcase, calculator route guard).
//
// Deliberately NOT React Context (CLAUDE.md bans Context-for-app-state): a tiny
// module-level pub/sub gives one shared value with no provider tree. Consumers
// derive their list from this one set — hard rule #3's single-source discipline
// holds; only the source moved from compile-time to runtime. The build-time
// registry defaults are the fallback so the app always renders, even offline.

import { useState, useEffect } from 'react'
import { calculatorApi } from '../api/calculatorApi'
import { CALCULATORS, DEFAULT_PUBLISHED_TYPES, categoriesFor } from './registry'

let publishedTypes = DEFAULT_PUBLISHED_TYPES // optimistic default until fetched
let fetched = false
let inflight = null
const listeners = new Set()

function emit() {
  listeners.forEach((fn) => fn())
}

function load() {
  if (inflight) return inflight
  inflight = calculatorApi
    .getPublished()
    .then(({ ok, data }) => {
      if (ok && Array.isArray(data?.published)) publishedTypes = data.published
    })
    .catch(() => {}) // keep the registry defaults on failure — app still renders
    .finally(() => {
      // Mark ready on BOTH success and failure: on failure we render with the
      // registry defaults rather than hanging the route guards forever.
      fetched = true
      inflight = null
      emit()
    })
  return inflight
}

// Force a refetch — call after an admin publish toggle so the public surface
// reflects the change without a full reload.
export function invalidatePublished() {
  fetched = false
  return load()
}

// Subscribe to the shared publish store. Returns { types, ready } — `ready` flips
// true once the initial fetch settles (success OR failure). Route guards must
// wait for `ready` before redirecting, or they'd act on the optimistic default
// set (which omits anything published beyond the build-time defaults) and strand
// a freshly-published calculator/tracker on direct navigation.
export function usePublishedState() {
  const [state, setState] = useState({ types: publishedTypes, ready: fetched })
  useEffect(() => {
    const sync = () => setState({ types: publishedTypes, ready: fetched })
    listeners.add(sync)
    sync() // adopt any value fetched before this mount
    if (!fetched) load()
    return () => listeners.delete(sync)
  }, [])
  return state
}

// The raw set of published calc-type strings (e.g. for a route guard).
export function usePublishedTypes() {
  return usePublishedState().types
}

// The derived published calculators + their categories, for grids and nav.
export function usePublishedCalculators() {
  const types = usePublishedTypes()
  const set = new Set(types)
  const publishedCalculators = CALCULATORS.filter((c) => set.has(c.type))
  return {
    publishedCalculators,
    publishedTypes: types,
    categories: categoriesFor(publishedCalculators),
  }
}
