import { useState, useCallback, useEffect, useRef } from 'react'
import { CALC_STORAGE_KEY } from '../constants'
import { stripVersion } from '../utils/migrateCalcData'

// Encapsulates all save-related state and logic for CalculatorPage.
//
// Usage:
//   const save = useSave({ type, auth, saveCalc, navigate, currentDataRef, onLoad })
//
// Returns:
//   activeSavedCalcId  — id of the currently loaded/saved record, or null
//   setActiveSavedCalcId
//   saveStatus         — null | 'saving' | 'saved' | 'error'
//   saveError          — string | null (auto-clears after 4s)
//   isSaving           — boolean (gates the save button)
//   showNameModal      — boolean
//   handleSaveClick    — call when save button is clicked
//   handleNameConfirm  — call when modal confirms with a name
//   handleNameCancel   — call when modal is dismissed
//   handleLoad         — (calc) => void
//   handleDelete       — (id) => void
//   handleNew          — () => void  — detach from active record so the next save
//                        creates a new record. Inputs are NOT reset (caller decides).
//
// Versioning note:
//   currentDataRef may contain an internal __v key from useCalculatorInputs.
//   stripVersion() removes it before sending to the backend so the stored
//   JSON stays clean. The version is re-injected on load via injectVersion()
//   in useCalculatorInputs / migrateCalcData.

export function useSave({ type, auth, saveCalc, navigate, currentDataRef, onLoad }) {
  const [activeSavedCalcId, setActiveSavedCalcId] = useState(null)
  const [saveStatus, setSaveStatus]               = useState(null)
  const [saveError, setSaveError]                 = useState(null)
  const [isSaving, setIsSaving]                   = useState(false)
  const [showNameModal, setShowNameModal]         = useState(false)

  const successTimerRef = useRef(null)
  const errorTimerRef   = useRef(null)

  useEffect(() => {
    return () => {
      clearTimeout(successTimerRef.current)
      clearTimeout(errorTimerRef.current)
    }
  }, [])

  // Reset the active record whenever the calculator type changes.
  // CalculatorPage doesn't unmount on route param changes — it stays mounted
  // and just receives a new `type`. Without this reset, an active record from
  // (say) FIRE would leak into Mortgage and the save button would mis-render
  // as "Update" on a different calculator.
  useEffect(() => {
    setActiveSavedCalcId(null)
    setSaveStatus(null)
    setSaveError(null)
  }, [type])

  const handleSaveClick = useCallback(() => {
    if (isSaving) return

    if (!auth.isAuthenticated) {
      const cleanData = stripVersion(currentDataRef.current)
      sessionStorage.setItem(CALC_STORAGE_KEY(type), JSON.stringify(cleanData))
      navigate('/login', { state: { from: `/app/calculator/${type}` } })
      return
    }

    if (activeSavedCalcId) {
      doSave(null, currentDataRef.current)
    } else {
      setShowNameModal(true)
    }
  }, [isSaving, auth.isAuthenticated, activeSavedCalcId, type])

  async function doSave(name, data) {
    setIsSaving(true)
    setSaveStatus('saving')
    setSaveError(null)

    const cleanData = stripVersion(data)
    const result = await saveCalc(name, type, cleanData, activeSavedCalcId)

    setIsSaving(false)

    if (result.success) {
      setActiveSavedCalcId(result.calculator.id)
      setSaveStatus('saved')
      successTimerRef.current = setTimeout(() => setSaveStatus(null), 2000)
    } else {
      setSaveStatus('error')
      setSaveError(result.error || 'Something went wrong. Please try again.')
      errorTimerRef.current = setTimeout(() => {
        setSaveStatus(null)
        setSaveError(null)
      }, 4000)
    }
  }

  const handleNameConfirm = useCallback((name) => {
    setShowNameModal(false)
    doSave(name, currentDataRef.current)
  }, [activeSavedCalcId, type])

  const handleNameCancel = useCallback(() => setShowNameModal(false), [])

  const handleLoad = useCallback((calc) => {
    setActiveSavedCalcId(calc.id)
    onLoad(calc)
  }, [onLoad])

  const handleDelete = useCallback((id) => {
    if (activeSavedCalcId === id) setActiveSavedCalcId(null)
  }, [activeSavedCalcId])

  // Detach from the active saved record. The next save will create a new
  // record (modal will appear for a name). Inputs are intentionally left
  // untouched so the user can fork an existing scenario into a new save.
  const handleNew = useCallback(() => {
    setActiveSavedCalcId(null)
    setSaveStatus(null)
    setSaveError(null)
  }, [])

  return {
    activeSavedCalcId,
    setActiveSavedCalcId,
    saveStatus,
    saveError,
    isSaving,
    showNameModal,
    handleSaveClick,
    handleNameConfirm,
    handleNameCancel,
    handleLoad,
    handleDelete,
    handleNew,
  }
}
