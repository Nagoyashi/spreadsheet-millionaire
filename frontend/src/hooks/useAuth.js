import { useState, useEffect, useCallback } from 'react'
import { authApi } from '../api/authApi'

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

  const login = useCallback(async (email, password) => {
    const { ok, data } = await authApi.login(email, password)
    if (ok) {
      setUser(data.user)
      return { success: true }
    }
    return { success: false, error: data.error, errors: data.errors }
  }, [])

  const register = useCallback(async (email, password) => {
    const { ok, data } = await authApi.register(email, password)
    if (ok) {
      setUser(data.user)
      return { success: true }
    }
    return { success: false, error: data.error, errors: data.errors }
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout()
    setUser(null)
  }, [])

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
  }
}
