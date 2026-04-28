import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { Save, Check, AlertCircle, Menu } from 'lucide-react'
import { useCalculatorData } from '../hooks/useCalculatorData'
import { CALC_MAP, VALID_TYPES } from '../calculators/registry'
import CalculatorSidebar from '../components/CalculatorSidebar'

const storageKey = (type) => `fintrackr_calc_${type}`

// ─── Save Name Modal ──────────────────────────────────────────────────────────
function SaveNameModal({ onConfirm, onCancel }) {
  const [name, setName] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (name.trim()) onConfirm(name.trim())
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
        <h3 className="text-xl font-bold text-gray-800 mb-1">Name this calculation</h3>
        <p className="text-sm text-gray-500 mb-4">Give it a name so you can find it later.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            placeholder="e.g. My FIRE plan"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-40"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
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

  const [activeSavedCalcId, setActiveSavedCalcId] = useState(null)
  const [initialData, setInitialData]             = useState(null)
  const currentDataRef                            = useRef({})
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [showNameModal, setShowNameModal]         = useState(false)
  // saveStatus: null | 'saving' | 'saved' | 'error'
  const [saveStatus, setSaveStatus]               = useState(null)
  const [saveError, setSaveError]                 = useState(null)
  const [isSaving, setIsSaving]                   = useState(false)

  // Restore inputs saved to sessionStorage before an auth redirect
  useEffect(() => {
    const stored = sessionStorage.getItem(storageKey(type))
    if (stored) {
      try { setInitialData(JSON.parse(stored)) } catch {}
      sessionStorage.removeItem(storageKey(type))
    }
  }, [type])

  // ─── Save logic ────────────────────────────────────────────────────────────

  function handleSaveClick() {
    if (isSaving) return

    if (!auth.isAuthenticated) {
      sessionStorage.setItem(storageKey(type), JSON.stringify(currentDataRef.current))
      navigate('/login', { state: { from: `/calculator/${type}` } })
      return
    }

    if (activeSavedCalcId) {
      doSave(null, currentDataRef.current)
    } else {
      setShowNameModal(true)
    }
  }

  async function doSave(name, data) {
    setIsSaving(true)
    setSaveStatus('saving')
    setSaveError(null)

    const result = await saveCalc(name, type, data, activeSavedCalcId)

    setIsSaving(false)

    if (result.success) {
      setActiveSavedCalcId(result.calculator.id)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 2000)
    } else {
      setSaveStatus('error')
      setSaveError(result.error || 'Something went wrong. Please try again.')
      setTimeout(() => { setSaveStatus(null); setSaveError(null) }, 4000)
    }
  }

  function handleNameConfirm(name) {
    setShowNameModal(false)
    doSave(name, currentDataRef.current)
  }

  // ─── Sidebar handlers ───────────────────────────────────────────────────────

  function handleLoad(calc) {
    setInitialData(calc.data)
    setActiveSavedCalcId(calc.id)
    setMobileSidebarOpen(false)
  }

  async function handleDelete(id) {
    await deleteCalc(id)
    if (activeSavedCalcId === id) {
      setActiveSavedCalcId(null)
      setInitialData(null)
    }
  }

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
    onDelete: handleDelete,
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
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
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

        {/* Calculator — component resolved from registry, no switch needed */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            <CalcComponent
              initialData={initialData}
              onDataChange={handleDataChange}
            />
          </div>
        </main>

      </div>

      {/* Save name modal */}
      {showNameModal && (
        <SaveNameModal
          onConfirm={handleNameConfirm}
          onCancel={() => setShowNameModal(false)}
        />
      )}

    </div>
  )
}
