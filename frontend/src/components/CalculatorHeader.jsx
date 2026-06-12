import { Save, Check, AlertCircle, Menu, FilePlus } from 'lucide-react'

// Header for the CalculatorPage: mobile menu, title, active-record badge,
// optional "New" button (only when an active record is loaded), save button
// with status states, and the inline error message.
//
// Pure presentation — all state and handlers come in as props. This keeps
// CalculatorPage focused on orchestration (routing, data, save coordination).

export default function CalculatorHeader({
  Icon,
  iconColor,
  label,
  activeCalcName,        // string | null — name of currently loaded saved record
  saveStatus,            // 'saving' | 'saved' | 'error' | null
  saveError,             // string | null
  saveLabel,             // 'Save' | 'Update' | 'Save (sign in)'
  isSaving,
  onSaveClick,
  onNewClick,            // () => void | null — when present and an active record exists, "New" button is shown
  onMobileMenuClick,
}) {
  const saveButtonClass =
    saveStatus === 'saved'  ? 'bg-emerald-600 hover:bg-emerald-700 text-white' :
    saveStatus === 'error'  ? 'bg-red-600 text-white' :
    saveStatus === 'saving' ? 'bg-blue-400 text-white cursor-wait' :
                              'bg-blue-600 hover:bg-blue-700 text-white'

  // Show "New" only when we'd otherwise be stuck in update-only mode
  const showNewButton = !!(onNewClick && activeCalcName)

  return (
    <header className="sticky top-0 z-30 lg:static bg-white border-b border-gray-200 px-6 py-4 shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden flex items-center justify-center min-h-[44px] min-w-[44px] -ml-2 text-gray-500 hover:text-gray-800"
            onClick={onMobileMenuClick}
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="p-1.5 rounded-lg bg-gray-50">
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-800">{label}</h1>
          {activeCalcName && (
            <span className="hidden sm:inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
              {activeCalcName}
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            {showNewButton && (
              <button
                onClick={onNewClick}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-3 py-2.5 sm:py-2 rounded-lg transition text-sm font-medium border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Detach from this saved record — next save will create a new one"
              >
                <FilePlus className="w-4 h-4" />
                New
              </button>
            )}
            <button
              onClick={onSaveClick}
              disabled={isSaving}
              className={`inline-flex items-center gap-2 px-4 py-2.5 sm:py-2 rounded-lg transition text-sm font-medium disabled:cursor-not-allowed ${saveButtonClass}`}
            >
              {saveStatus === 'saving' && <><Save className="w-4 h-4" /> Saving…</>}
              {saveStatus === 'saved'  && <><Check className="w-4 h-4" /> Saved</>}
              {saveStatus === 'error'  && <><AlertCircle className="w-4 h-4" /> Error</>}
              {!saveStatus             && <><Save className="w-4 h-4" /> {saveLabel}</>}
            </button>
          </div>
          {saveError && <p className="text-xs text-red-500 text-right">{saveError}</p>}
        </div>
      </div>
    </header>
  )
}
