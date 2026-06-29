import { useState, useEffect, useCallback } from 'react'
import { authApi } from '../api/authApi'
import { describeError, registerUnauthorizedHandler } from '../api/httpClient'

// Shared auth state across the app.
// Usage: const { user, loading, isAuthenticated, login, logout, register, deleteAccount } = useAuth()
//
// App.jsx calls this once and passes the returned object down as props.
// No Context needed at this scale.

export function useAuth() {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount: check if there's an existing session (page refresh, returning user)
  useEffect(() => {
    authApi.getStatus().then(({ ok, data }) => {
      if (ok && data.logged_in) setUser(data.user)
    }).finally(() => setLoading(false))
  }, [])

  // Central 401 handler (#21): when any authenticated request gets a 401 (the
  // session expired/cleared server-side), drop the user so the app reflects
  // logged-out and prompts re-auth — instead of every save/load failing with a
  // generic error while the UI still shows logged-in. setUser is stable.
  useEffect(() => {
    registerUnauthorizedHandler(() => setUser(null))
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await authApi.login(email, password)
    if (res.ok) {
      setUser(res.data.user)
      return { success: true }
    }
    // data is null on a transport failure — guard the access and let
    // describeError() turn the result into a message the form can show.
    return { success: false, error: describeError(res), errors: res.data?.errors }
  }, [])

  const register = useCallback(async (email, password) => {
    const res = await authApi.register(email, password)
    if (res.ok) {
      setUser(res.data.user)
      return { success: true }
    }
    return { success: false, error: describeError(res), errors: res.data?.errors }
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout()
    setUser(null)
  }, [])

  // Replace the cached user with a fresh server copy (e.g. after an email
  // change). Keeps the prop-drilled auth object the single source of truth.
  const applyUser = useCallback((u) => setUser(u), [])

  const deleteAccount = useCallback(async (password) => {
    const { ok, data } = await authApi.deleteAccount(password)
    if (ok) {
      setUser(null)
      return { success: true }
    }
    return { success: false, error: data?.error || 'Something went wrong.' }
  }, [])

  return {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    deleteAccount,
    applyUser,
  }
}
