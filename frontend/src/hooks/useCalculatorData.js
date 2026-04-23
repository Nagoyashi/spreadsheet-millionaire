import { useState, useEffect, useCallback } from 'react'
import { calculatorApi } from '../api/calculatorApi'

// Manages the list of saved calculations for the authenticated user.
//
// Usage:
//   const { savedCalcs, loading, saveCalc, updateCalc, deleteCalc } = useCalculatorData(isAuthenticated, calcType)
//
// - Only fetches when isAuthenticated becomes true
// - Re-fetches when calcType changes (sidebar filters by type)
// - saveCalc handles the Option B smart save: POST if no activeSavedCalcId, PUT if one exists

export function useCalculatorData(isAuthenticated, calcType) {
  const [savedCalcs, setSavedCalcs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchCalcs = useCallback(async () => {
    if (!isAuthenticated) return
    setLoading(true)
    setError(null)
    try {
      const { ok, data } = await calculatorApi.getAll(calcType)
      if (ok) setSavedCalcs(data.calculators)
      else setError('Failed to load saved calculations.')
    } catch {
      setError('Network error.')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, calcType])

  // Fetch on mount and whenever auth state or type changes
  useEffect(() => {
    if (isAuthenticated) fetchCalcs()
    else setSavedCalcs([]) // clear on logout
  }, [isAuthenticated, fetchCalcs])

  // Option B smart save:
  //   activeSavedCalcId = null  → POST (create new)
  //   activeSavedCalcId = number → PUT (update existing)
  // Returns the saved/updated record so CalculatorPage can update activeSavedCalcId.
  const saveCalc = useCallback(async (name, calcTypeArg, data, activeSavedCalcId) => {
    try {
      if (activeSavedCalcId) {
        // Update existing record
        const { ok, data: updated } = await calculatorApi.update(activeSavedCalcId, { data })
        if (!ok) return { success: false, error: 'Failed to update.' }
        setSavedCalcs(prev =>
          prev.map(c => c.id === activeSavedCalcId ? updated.calculator : c)
        )
        return { success: true, calculator: updated.calculator }
      } else {
        // Create new record
        const { ok, data: created } = await calculatorApi.create(name, calcTypeArg, data)
        if (!ok) return { success: false, error: 'Failed to save.' }
        setSavedCalcs(prev => [created.calculator, ...prev])
        return { success: true, calculator: created.calculator }
      }
    } catch {
      return { success: false, error: 'Network error.' }
    }
  }, [])

  const updateCalc = useCallback(async (id, fields) => {
    try {
      const { ok, data } = await calculatorApi.update(id, fields)
      if (!ok) return { success: false, error: 'Failed to update.' }
      setSavedCalcs(prev =>
        prev.map(c => c.id === id ? data.calculator : c)
      )
      return { success: true, calculator: data.calculator }
    } catch {
      return { success: false, error: 'Network error.' }
    }
  }, [])

  const deleteCalc = useCallback(async (id) => {
    try {
      const { ok } = await calculatorApi.remove(id)
      if (!ok) return { success: false, error: 'Failed to delete.' }
      setSavedCalcs(prev => prev.filter(c => c.id !== id))
      return { success: true }
    } catch {
      return { success: false, error: 'Network error.' }
    }
  }, [])

  return {
    savedCalcs,
    loading,
    error,
    saveCalc,
    updateCalc,
    deleteCalc,
    refetch: fetchCalcs,
  }
}
