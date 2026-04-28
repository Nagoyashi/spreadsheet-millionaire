import { useState, useEffect } from 'react'
import { FAVOURITES_KEY } from '../constants'

// Manages per-user favourites stored in localStorage.
//
// Usage:
//   const { favourites, toggle } = useFavourites(auth)
//
// - Returns [] when user is not authenticated
// - Reloads from localStorage when auth state changes (login/logout/account switch)
// - toggle(type) is a no-op when not authenticated — callers should gate on auth first
// - Storage key is scoped to user ID so different accounts have independent favourites

export function useFavourites(auth) {
  const key = auth.isAuthenticated ? FAVOURITES_KEY(auth.user.id) : null

  const [favourites, setFavourites] = useState(() => {
    if (!key) return []
    try { return JSON.parse(localStorage.getItem(key)) || [] }
    catch { return [] }
  })

  // Re-sync when auth state changes: login, logout, or account switch
  useEffect(() => {
    if (!key) { setFavourites([]); return }
    try { setFavourites(JSON.parse(localStorage.getItem(key)) || []) }
    catch { setFavourites([]) }
  }, [key])

  function toggle(type) {
    if (!key) return
    setFavourites(prev => {
      const next = prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
      localStorage.setItem(key, JSON.stringify(next))
      return next
    })
  }

  return { favourites, toggle }
}
