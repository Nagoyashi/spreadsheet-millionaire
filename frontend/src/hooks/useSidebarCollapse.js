import { useSyncExternalStore } from 'react'

// Session-scoped sidebar collapse state.
//
// Lives at module scope so the collapsed/expanded choice PERSISTS across route
// changes — the layout shell (AppShell) is re-mounted per page, so per-component
// useState would reset on every navigation. This is deliberately NOT browser
// storage, a store library, or Context: it's a single app-wide UI boolean, the
// minimum machinery that satisfies "persist across navigation within a session"
// (see DECISIONS.md § "Shared collapsible sidebar"). It resets on a full reload,
// which is the intended lifetime for an ephemeral view preference.

let collapsed = false
const listeners = new Set()

function emit() {
  for (const listener of listeners) listener()
}

export function setSidebarCollapsed(next) {
  collapsed = typeof next === 'function' ? next(collapsed) : next
  emit()
}

function subscribe(callback) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

function getSnapshot() {
  return collapsed
}

// Returns [collapsed, toggle]. Mirrors the useState tuple shape so consumers read
// naturally, but the value is shared across every mounted sidebar instance.
export function useSidebarCollapse() {
  const value = useSyncExternalStore(subscribe, getSnapshot)
  return [value, () => setSidebarCollapsed((c) => !c)]
}
