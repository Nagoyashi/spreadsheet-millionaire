import { useState, useCallback, useEffect, useRef } from 'react'

// Encapsulates all save-related state and logic for CalculatorPage.
//
// Usage:
//   const save = useSave({ type, auth, saveCalc, navigate })
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
//   handleLoad         — (calc) => void — call when a saved calc is loaded from sidebar

export function useSave({ type, auth, saveCalc, navigate, currentDataRef, onLoad }) {
  const [activeSavedCalcId, setActiveSavedCalcId] = useState(null)
  const [saveStatus, setSaveStatus]               = useState(null) // null | 'saving' | 'saved' | 'error'
  const [saveError, setSaveError]                 = useState(null)
  const [isSaving, setIsSaving]                   = useState(false)
  const [showNameModal, setShowNameModal]         = useState(false)

  // Timeout refs — stored so we can clear them on unmount and avoid
  // setting state on an unmounted component.
  const successTimerRef = useRef(null)
  const errorTimerRef   = useRef(null)

  useEffect(() => {
    return () => {
      clearTimeout(successTimerRef.current)
      clearTimeout(errorTimerRef.current)
    }
  }, [])

  const handleSaveClick = useCallback(() => {
    if (isSaving) return

    if (!auth.isAuthenticated) {
      // Persist current inputs so they survive the login redirect
      sessionStorage.setItem(`fintrackr_calc_${type}`, JSON.stringify(currentDataRef.current))
      navigate('/login', { state: { from: `/calculator/${type}` } })
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

    const result = await saveCalc(name, type, data, activeSavedCalcId)

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

  const handleNameCancel = useCallback(() => {
    setShowNameModal(false)
  }, [])

  const handleLoad = useCallback((calc) => {
    setActiveSavedCalcId(calc.id)
    onLoad(calc) // delegate initialData + mobile sidebar close back to page
  }, [onLoad])

  const handleDelete = useCallback((id) => {
    if (activeSavedCalcId === id) {
      setActiveSavedCalcId(null)
    }
  }, [activeSavedCalcId])

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
  }
}
