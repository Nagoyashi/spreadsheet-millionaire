import { Save, Check, AlertCircle, Menu } from 'lucide-react'

// Header for the CalculatorPage: mobile menu, title, active-record badge,
// save button with status states, and the inline error message.
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
  onMobileMenuClick,
}) {
  const saveButtonClass =
    saveStatus === 'saved'  ? 'bg-emerald-600 hover:bg-emerald-700 text-white' :
    saveStatus === 'error'  ? 'bg-red-600 text-white' :
    saveStatus === 'saving' ? 'bg-blue-400 text-white cursor-wait' :
                              'bg-blue-600 hover:bg-blue-700 text-white'

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            className="md:hidden text-gray-500 hover:text-gray-800 mr-1"
            onClick={onMobileMenuClick}
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="p-1.5 rounded-lg bg-gray-50">
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">{label}</h1>
          {activeCalcName && (
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
              {activeCalcName}
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={onSaveClick}
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
  )
}
