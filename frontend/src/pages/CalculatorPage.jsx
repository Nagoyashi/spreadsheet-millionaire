import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { useCalculatorData } from '../hooks/useCalculatorData'
import { useSave } from '../hooks/useSave'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { CALC_MAP } from '../calculators/registry'
import { usePublishedTypes } from '../calculators/usePublished'
import { CALC_STORAGE_KEY } from '../constants'
import AppShell from '../components/AppShell'
import SavedCalculationsSidebar from '../components/SavedCalculationsSidebar'
import CalculatorHeader from '../components/CalculatorHeader'
import CalculatorExplainer from '../components/CalculatorExplainer'
import CalculatorSkeleton from '../components/ui/CalculatorSkeleton'
import SaveNameModal from '../components/ui/SaveNameModal'

// Orchestrates the calculator experience: routing guard, data fetch,
// save coordination, sidebar state. Header + skeleton are extracted.
// The pedagogical "What is X?" explainer is rendered above the Suspense
// boundary so it's visible immediately on first load (before the lazy
// calculator chunk arrives).

export default function CalculatorPage({ auth }) {
  const { type } = useParams()
  const navigate = useNavigate()

  // A type that is unknown OR exists but is unpublished redirects to the landing
  // page — but the redirect is returned only AFTER every hook below has run (see
  // the guard further down), so the hook order is identical on every render
  // (React's rules-of-hooks). The published set can now include TRACKER slugs
  // (e.g. 'net-worth'), which are NOT calculators — so a type only counts as
  // published-here when it's a real calculator (CALC_MAP[type]) AND in the set.
  // Otherwise a published tracker slug at /app/calculator/net-worth would slip
  // past the guard and render with an undefined component. CALC_MAP still holds
  // all 12 calculators so saved rows for unpublished types remain loadable.
  const publishedTypes = usePublishedTypes()
  const calc = CALC_MAP[type]
  const isPublished = !!calc && publishedTypes.includes(type)
  const { component: CalcComponent, label, Icon, color, gradient, explainer } = calc ?? {}

  useDocumentTitle(label ? `${label} — SpreadsheetMillionaire` : 'SpreadsheetMillionaire')

  const {
    savedCalcs,
    loading: calcsLoading,
    error: calcsError,
    saveCalc,
    updateCalc,
    deleteCalc,
  } = useCalculatorData(auth.isAuthenticated, type)

  const [initialData, setInitialData] = useState(null)
  const currentDataRef                = useRef({})

  // Restore inputs saved to sessionStorage before an auth redirect
  useEffect(() => {
    const stored = sessionStorage.getItem(CALC_STORAGE_KEY(type))
    if (stored) {
      try { setInitialData(JSON.parse(stored)) } catch { /* ignore malformed stored payload */ }
      sessionStorage.removeItem(CALC_STORAGE_KEY(type))
    }
  }, [type])

  const {
    activeSavedCalcId,
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
  } = useSave({
    type,
    auth,
    saveCalc,
    navigate,
    currentDataRef,
    onLoad: (calc) => {
      setInitialData(calc.data)
    },
  })

  const handleDeleteCalc = useCallback(async (id) => {
    await deleteCalc(id)
    handleDelete(id)
    if (activeSavedCalcId === id) setInitialData(null)
  }, [deleteCalc, handleDelete, activeSavedCalcId])

  const handleDataChange = useCallback((data) => {
    currentDataRef.current = data
  }, [])

  const activeCalc = savedCalcs.find(c => c.id === activeSavedCalcId)

  const saveLabel = auth.isAuthenticated
    ? (activeSavedCalcId ? 'Update' : 'Save')
    : 'Save (sign in)'

  const calculator = useMemo(
    () =>
      CalcComponent ? (
        <CalcComponent initialData={initialData} onDataChange={handleDataChange} />
      ) : null,
    [CalcComponent, initialData, handleDataChange]
  )

  // Every hook above runs unconditionally; only now is it safe to bail out for an
  // unknown/unpublished type without changing hook order between renders.
  if (!isPublished) return <Navigate to="/app" replace />

  // Saved-calcs slot for the sidebar (authenticated only). The function form
  // receives `onClose` so loading a record dismisses the mobile drawer.
  const savedCalcsSlot = auth.isAuthenticated
    ? (onClose) => (
        <SavedCalculationsSidebar
          savedCalcs={savedCalcs}
          loading={calcsLoading}
          error={calcsError}
          activeSavedCalcId={activeSavedCalcId}
          onLoad={(calc) => {
            handleLoad(calc)
            onClose?.()
          }}
          onDeselect={handleNew}            // click active record in sidebar = detach
          onRename={(id, name) => updateCalc(id, { name })}
          onDelete={handleDeleteCalc}
        />
      )
    : null

  return (
    <AppShell auth={auth} sidebar={savedCalcsSlot}>
      {({ openSidebar }) => (
        <>
          <CalculatorHeader
            Icon={Icon}
            iconColor={color}
            label={label}
            activeCalcName={activeSavedCalcId && activeCalc ? activeCalc.name : null}
            saveStatus={saveStatus}
            saveError={saveError}
            saveLabel={saveLabel}
            isSaving={isSaving}
            onSaveClick={handleSaveClick}
            onNewClick={handleNew}
            onMobileMenuClick={openSidebar}
          />

          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-5xl mx-auto space-y-6">
              <CalculatorExplainer Icon={Icon} gradient={gradient} explainer={explainer} />
              <Suspense fallback={<CalculatorSkeleton />}>
                {calculator}
              </Suspense>
            </div>
          </main>

          {showNameModal && (
            <SaveNameModal onConfirm={handleNameConfirm} onCancel={handleNameCancel} />
          )}
        </>
      )}
    </AppShell>
  )
}
