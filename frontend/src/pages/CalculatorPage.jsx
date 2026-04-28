import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { Save, Check, AlertCircle, Menu } from 'lucide-react'
import { useCalculatorData } from '../hooks/useCalculatorData'
import { useSave } from '../hooks/useSave'
import { CALC_MAP, VALID_TYPES } from '../calculators/registry'
import { CALC_STORAGE_KEY } from '../constants'
import CalculatorSidebar from '../components/CalculatorSidebar'
import SaveNameModal from '../components/ui/SaveNameModal'

// ─── Loading skeleton shown while a lazy calculator chunk downloads ───────────
function CalculatorSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-5 h-28">
            <div className="flex justify-between mb-3">
              <div className="h-3 bg-gray-100 rounded w-24" />
              <div className="w-8 h-8 bg-gray-100 rounded-lg" />
            </div>
            <div className="h-7 bg-gray-100 rounded w-32 mb-2" />
            <div className="h-2 bg-gray-100 rounded w-20" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg shadow-sm p-6 h-72">
        <div className="h-4 bg-gray-100 rounded w-48 mb-6" />
        <div className="h-48 bg-gray-50 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-6 h-56">
            <div className="h-4 bg-gray-100 rounded w-32 mb-5" />
            {[...Array(3)].map((_, j) => (
              <div key={j} className="mb-4">
                <div className="h-2.5 bg-gray-100 rounded w-24 mb-2" />
                <div className="h-9 bg-gray-50 rounded-lg border border-gray-100" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CalculatorPage({ auth }) {
  const { type } = useParams()
  const navigate = useNavigate()

  if (!VALID_TYPES.includes(type)) return <Navigate to="/" replace />

  const { component: CalcComponent, label, Icon, color } = CALC_MAP[type]

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

  const saveButtonClass =
    saveStatus === 'saved'  ? 'bg-emerald-600 hover:bg-emerald-700 text-white' :
    saveStatus === 'error'  ? 'bg-red-600 text-white' :
    saveStatus === 'saving' ? 'bg-blue-400 text-white cursor-wait' :
                              'bg-blue-600 hover:bg-blue-700 text-white'

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

        <header className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button className="md:hidden text-gray-500 hover:text-gray-800 mr-1" onClick={() => setMobileSidebarOpen(true)} aria-label="Open sidebar">
                <Menu className="w-5 h-5" />
              </button>
              <div className="p-1.5 rounded-lg bg-gray-50">
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <h1 className="text-3xl font-bold text-gray-800">{label}</h1>
              {activeSavedCalcId && activeCalc && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                  {activeCalc.name}
                </span>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={handleSaveClick}
                disabled={isSaving}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition text-sm font-medium disabled:cursor-not-allowed ${saveButtonClass}`}
              >
                {saveStatus === 'saving' && <><Save className="w-4 h-4" /> Saving…</>}
                {saveStatus === 'saved'  && <><Check className="w-4 h-4" /> Saved</>}
                {saveStatus === 'error'  && <><AlertCircle className="w-4 h-4" /> Error</>}
                {!saveStatus             && <><Save className="w-4 h-4" /> {saveLabel}</>}
              </button>
              {saveError && <p className="text-xs text-red-500 text-right">{saveError}</p>}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
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
