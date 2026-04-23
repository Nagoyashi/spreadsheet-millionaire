import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom'
import { useCalculatorData } from '../hooks/useCalculatorData'
import FIRECalculator from '../components/calculators/FIRECalculator'
import CompoundInterestCalculator from '../components/calculators/CompoundInterestCalculator'
import SankeyDiagram from '../components/calculators/SankeyDiagram'
import SavedCalculationsSidebar from '../components/SavedCalculationsSidebar'

const VALID_TYPES = ['fire', 'compound', 'sankey']

const CALC_LABELS = {
  fire: 'FIRE Calculator',
  compound: 'Compound Interest',
  sankey: 'Cash Flow Sankey',
}

// sessionStorage key pattern for persisting inputs across auth redirect
const storageKey = (type) => `fintrackr_calc_${type}`

// ─── Save Name Modal ──────────────────────────────────────────────────────────
function SaveNameModal({ onConfirm, onCancel }) {
  const [name, setName] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (name.trim()) onConfirm(name.trim())
  }

  return (
    <div className="fixed inset-0 bg-stone-950/80 flex items-center justify-center z-50 px-4">
      <div className="bg-stone-900 border border-stone-700 p-6 w-full max-w-sm">
        <h3 className="font-display text-xl text-stone-100 mb-1">Name this calculation</h3>
        <p className="font-body text-sm text-stone-500 mb-4">
          Give it a name so you can find it later.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            placeholder="e.g. My FIRE plan"
            className="w-full bg-stone-800 border border-stone-700 text-stone-100 font-body text-sm px-4 py-3 focus:outline-none focus:border-amber-400 transition-colors placeholder-stone-600"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 bg-amber-400 text-stone-950 font-body font-medium text-sm py-2.5 hover:bg-amber-300 transition-colors disabled:opacity-40"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 border border-stone-700 text-stone-400 font-body text-sm py-2.5 hover:text-stone-100 hover:border-stone-500 transition-colors"
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

  const { savedCalcs, loading: calcsLoading, saveCalc, updateCalc, deleteCalc } =
    useCalculatorData(auth.isAuthenticated, type)

  // The currently-loaded saved calc id (null = unsaved / new)
  const [activeSavedCalcId, setActiveSavedCalcId] = useState(null)

  // Data to inject into the calculator (from a saved calc load or sessionStorage restore)
  const [initialData, setInitialData] = useState(null)

  // Latest data emitted by the calculator via onDataChange
  const currentDataRef = useRef({})

  // Sidebar open on desktop, togglable on mobile
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Save name modal
  const [showNameModal, setShowNameModal] = useState(false)

  // Feedback: 'saving' | 'saved' | 'error' | null
  const [saveStatus, setSaveStatus] = useState(null)

  // ── Restore from sessionStorage on mount (after auth redirect) ──────────────
  useEffect(() => {
    const stored = sessionStorage.getItem(storageKey(type))
    if (stored) {
      try {
        setInitialData(JSON.parse(stored))
      } catch {
        // ignore malformed data
      }
      sessionStorage.removeItem(storageKey(type))
    }
  }, [type])

  // ── Redirect unauthenticated users to login when they hit Save ───────────────
  function handleSaveClick(currentData) {
    if (!auth.isAuthenticated) {
      // Persist current inputs before navigating away
      sessionStorage.setItem(storageKey(type), JSON.stringify(currentData))
      navigate('/login', { state: { from: `/calculator/${type}` } })
      return
    }

    if (activeSavedCalcId) {
      // Option B: already have an active saved calc → PUT directly, no name needed
      doSave(null, currentData)
    } else {
      // New save → ask for a name first
      setShowNameModal(true)
    }
  }

  async function doSave(name, data) {
    setSaveStatus('saving')
    const result = await saveCalc(name, type, data, activeSavedCalcId)
    if (result.success) {
      setActiveSavedCalcId(result.calculator.id)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 2000)
    } else {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus(null), 3000)
    }
  }

  function handleNameConfirm(name) {
    setShowNameModal(false)
    doSave(name, currentDataRef.current)
  }

  // ── Load a saved calculation into the calculator ─────────────────────────────
  function handleLoad(calc) {
    setInitialData(calc.data)
    setActiveSavedCalcId(calc.id)
  }

  // ── Calculator emits its current data on every change ────────────────────────
  const handleDataChange = useCallback((data) => {
    currentDataRef.current = data
  }, [])

  // ── Render the right calculator component ────────────────────────────────────
  function renderCalculator() {
    const props = { initialData, onDataChange: handleDataChange }
    switch (type) {
      case 'fire':     return <FIRECalculator {...props} />
      case 'compound': return <CompoundInterestCalculator {...props} />
      case 'sankey':   return <SankeyDiagram {...props} />
      default:         return null
    }
  }

  // Guard invalid type params
  if (!VALID_TYPES.includes(type)) return <Navigate to="/" replace />

  const activeCalc = savedCalcs.find(c => c.id === activeSavedCalcId)

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col">
      {/* Nav */}
      <nav className="border-b border-stone-800 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/" className="font-display text-xl text-stone-100 tracking-tight">
            FIN<span className="text-amber-400">trackr</span>
          </Link>
          <span className="text-stone-700">·</span>
          <span className="font-mono text-xs text-stone-500 uppercase tracking-widest">
            {CALC_LABELS[type]}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Save / Update button */}
          <button
            onClick={() => handleSaveClick(currentDataRef.current)}
            className={`font-body text-sm px-4 py-1.5 transition-colors font-medium ${
              saveStatus === 'saved'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : saveStatus === 'error'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : saveStatus === 'saving'
                ? 'bg-stone-800 text-stone-500 border border-stone-700 cursor-wait'
                : activeSavedCalcId
                ? 'bg-stone-800 text-stone-300 border border-stone-700 hover:border-amber-400/50 hover:text-stone-100'
                : 'bg-amber-400 text-stone-950 hover:bg-amber-300'
            }`}
          >
            {saveStatus === 'saving' ? 'Saving…'
              : saveStatus === 'saved' ? '✓ Saved'
              : saveStatus === 'error' ? 'Error'
              : activeSavedCalcId ? `Update "${activeCalc?.name ?? '…'}"`
              : auth.isAuthenticated ? 'Save'
              : 'Save (sign in)'}
          </button>

          {/* Sidebar toggle */}
          {auth.isAuthenticated && (
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="font-mono text-xs text-stone-500 hover:text-stone-300 tracking-widest uppercase transition-colors"
            >
              {sidebarOpen ? 'Hide saved' : 'Saved'}
            </button>
          )}

          {/* Auth */}
          {auth.isAuthenticated ? (
            <button
              onClick={auth.logout}
              className="font-body text-sm text-stone-500 hover:text-stone-300 transition-colors"
            >
              Sign out
            </button>
          ) : (
            <button
              onClick={() => navigate('/login', { state: { from: `/calculator/${type}` } })}
              className="font-body text-sm text-stone-400 hover:text-stone-100 transition-colors"
            >
              Sign in
            </button>
          )}
        </div>
      </nav>

      {/* Body: calculator + sidebar */}
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {renderCalculator()}
        </main>

        {auth.isAuthenticated && sidebarOpen && (
          <SavedCalculationsSidebar
            savedCalcs={savedCalcs}
            loading={calcsLoading}
            activeSavedCalcId={activeSavedCalcId}
            onLoad={handleLoad}
            onRename={(id, name) => updateCalc(id, { name })}
            onDelete={async (id) => {
              await deleteCalc(id)
              if (activeSavedCalcId === id) {
                setActiveSavedCalcId(null)
                setInitialData(null)
              }
            }}
          />
        )}
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
