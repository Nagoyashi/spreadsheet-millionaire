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
  listeners.forEach((fn) => fn(publishedTypes))
}

function load() {
  if (inflight) return inflight
  inflight = calculatorApi
    .getPublished()
    .then(({ ok, data }) => {
      if (ok && Array.isArray(data?.published)) {
        publishedTypes = data.published
        fetched = true
        emit()
      }
    })
    .catch(() => {}) // keep the registry defaults on failure — app still renders
    .finally(() => {
      inflight = null
    })
  return inflight
}

// Force a refetch — call after an admin publish toggle so the public surface
// reflects the change without a full reload.
export function invalidatePublished() {
  fetched = false
  return load()
}

// The raw set of published calc-type strings (e.g. for a route guard).
export function usePublishedTypes() {
  const [types, setTypes] = useState(publishedTypes)
  useEffect(() => {
    listeners.add(setTypes)
    setTypes(publishedTypes) // sync to any value fetched before this mount
    if (!fetched) load()
    return () => listeners.delete(setTypes)
  }, [])
  return types
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
