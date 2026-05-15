import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { useCalculatorData } from '../hooks/useCalculatorData'
import { useSave } from '../hooks/useSave'
import { CALC_MAP, VALID_TYPES } from '../calculators/registry'
import { CALC_STORAGE_KEY } from '../constants'
import CalculatorSidebar from '../components/CalculatorSidebar'
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

  if (!VALID_TYPES.includes(type)) return <Navigate to="/" replace />

  const { component: CalcComponent, label, Icon, color, gradient, explainer } = CALC_MAP[type]

  const {
    savedCalcs,
    loading: calcsLoading,
    error: calcsError,
    saveCalc,
    updateCalc,
    deleteCalc,
  } = useCalculatorData(auth.isAuthenticated, type)

  const [initialData, setInitialData]             = useState(null)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const currentDataRef                            = useRef({})

  // Restore inputs saved to sessionStorage before an auth redirect
  useEffect(() => {
    const stored = sessionStorage.getItem(CALC_STORAGE_KEY(type))
    if (stored) {
      try { setInitialData(JSON.parse(stored)) } catch {}
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
      setMobileSidebarOpen(false)
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

  const calculator = useMemo(() => (
    <CalcComponent initialData={initialData} onDataChange={handleDataChange} />
  ), [CalcComponent, initialData, handleDataChange])

  const sidebarProps = {
    activeType: type,
    auth,
    savedCalcs,
    calcsLoading,
    calcsError,
    activeSavedCalcId,
    onLoad: handleLoad,
    onDeselect: handleNew,                  // click active record in sidebar = detach
    onRename: (id, name) => updateCalc(id, { name }),
    onDelete: handleDeleteCalc,
    onClose: () => setMobileSidebarOpen(false),
    onNavigateLogin: () => navigate('/login', { state: { from: `/calculator/${type}` } }),
  }

  return (
    <div className="min-h-screen flex">

      <div className="hidden md:block">
        <CalculatorSidebar {...sidebarProps} />
      </div>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <CalculatorSidebar {...sidebarProps} />
          <div className="flex-1 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
        </div>
      )}

      <div className="flex-1 flex flex-col bg-gray-100 min-h-screen">

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
          onMobileMenuClick={() => setMobileSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            <CalculatorExplainer Icon={Icon} gradient={gradient} explainer={explainer} />
            <Suspense fallback={<CalculatorSkeleton />}>
              {calculator}
            </Suspense>
          </div>
        </main>

      </div>

      {showNameModal && (
        <SaveNameModal onConfirm={handleNameConfirm} onCancel={handleNameCancel} />
      )}

    </div>
  )
}
