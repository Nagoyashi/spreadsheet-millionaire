import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { Save, Check, AlertCircle, Menu } from 'lucide-react'
import { useCalculatorData } from '../hooks/useCalculatorData'
import { useSave } from '../hooks/useSave'
import { CALC_MAP, VALID_TYPES } from '../calculators/registry'
import CalculatorSidebar from '../components/CalculatorSidebar'
import SaveNameModal from '../components/ui/SaveNameModal'
import { Suspense } from 'react'

const storageKey = (type) => `fintrackr_calc_${type}`

export default function CalculatorPage({ auth }) {
  const { type } = useParams()
  const navigate = useNavigate()

  // Guard early — invalid type redirects before hooks run into bad state
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
    const stored = sessionStorage.getItem(storageKey(type))
    if (stored) {
      try { setInitialData(JSON.parse(stored)) } catch {}
      sessionStorage.removeItem(storageKey(type))
    }
  }, [type])

  // ─── Save logic (fully encapsulated in useSave) ───────────────────────────

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

  // Wrap deleteCalc to also clear initialData if the active calc is deleted
  const handleDeleteCalc = useCallback(async (id) => {
    await deleteCalc(id)
    handleDelete(id)
    if (activeSavedCalcId === id) setInitialData(null)
  }, [deleteCalc, handleDelete, activeSavedCalcId])

  const handleDataChange = useCallback((data) => {
    currentDataRef.current = data
  }, [])

  // ─── Derived UI state ───────────────────────────────────────────────────────

  const activeCalc = savedCalcs.find(c => c.id === activeSavedCalcId)

  const saveButtonClass =
    saveStatus === 'saved'  ? 'bg-emerald-600 hover:bg-emerald-700 text-white' :
    saveStatus === 'error'  ? 'bg-red-600 text-white' :
    saveStatus === 'saving' ? 'bg-blue-400 text-white cursor-wait' :
                              'bg-blue-600 hover:bg-blue-700 text-white'

  const saveLabel = auth.isAuthenticated
    ? (activeSavedCalcId ? 'Update' : 'Save')
    : 'Save (sign in)'

  // ─── Memoized calculator render ─────────────────────────────────────────────
  // CalcComponent, initialData, and handleDataChange are the only things that
  // should trigger a re-render of the calculator itself. Input keystrokes inside
  // the calculator don't change any of these, so the calculator manages its own
  // re-renders internally. This prevents sidebar interactions, save button state
  // changes, and modal open/close from re-rendering the calculator.

  const calculator = useMemo(() => (
    <CalcComponent
      initialData={initialData}
      onDataChange={handleDataChange}
    />
  ), [CalcComponent, initialData, handleDataChange])

  // ─── Shared sidebar props ───────────────────────────────────────────────────

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

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex">

      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <CalculatorSidebar {...sidebarProps} />
      </div>

      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <CalculatorSidebar {...sidebarProps} />
          <div
            className="flex-1 bg-black/50"
            onClick={() => setMobileSidebarOpen(false)}
          />
        </div>
      )}

      {/* ── Content area ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-gray-100 min-h-screen">

        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">

            {/* Left: mobile menu + calculator title */}
            <div className="flex items-center gap-3">
              <button
                className="md:hidden text-gray-500 hover:text-gray-800 mr-1"
                onClick={() => setMobileSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="p-1.5 rounded-lg bg-gray-50">
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <h1 className="text-3xl font-bold text-gray-800">{label}</h1>
              {activeSavedCalcId && activeCalc && (
                <span className="px-2 py-0.5 text-xs font-semibond rounded-full bg-blue-100 text-blue-800">
                  {activeCalc.name}
                </span>
              )}
            </div>

            {/* Right: save button + inline error */}
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
              {saveError && (
                <p className="text-xs text-red-500 text-right">{saveError}</p>
              )}
            </div>

          </div>
        </header>

        {/* Calculator — memoized, only re-renders when initialData changes */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            <Suspense fallback={
              <div className="flex items-center justify-center py-24">
                <span className="text-sm text-gray-400 animate-pulse">Loading…</span>
              </div>
            }>
              {calculator}
            </Suspense>
          </div>
        </main>

      </div>

      {/* Save name modal */}
      {showNameModal && (
        <SaveNameModal
          onConfirm={handleNameConfirm}
          onCancel={handleNameCancel}
        />
      )}

    </div>
  )
}
