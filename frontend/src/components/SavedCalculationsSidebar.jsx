import { useState } from 'react'
import { Pencil, Trash2, BookOpen, AlertCircle } from 'lucide-react'

function RenameableItem({ calc, isActive, onLoad, onDeselect, onRename, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(calc.name)
  const [deleting, setDeleting] = useState(false)

  function commitRename() {
    setEditing(false)
    if (draft.trim() && draft.trim() !== calc.name) {
      onRename(calc.id, draft.trim())
    } else {
      setDraft(calc.name)
    }
  }

  async function handleDelete(e) {
    e.stopPropagation()
    setDeleting(true)
    await onDelete(calc.id)
    // No need to setDeleting(false) — component unmounts on successful delete.
    // If it fails, the parent surfaces the error and this item stays mounted.
    setDeleting(false)
  }

  // Clicking the active record toggles deselect; clicking any other record loads it.
  function handleClick() {
    if (editing) return
    if (isActive && onDeselect) onDeselect()
    else onLoad(calc)
  }

  return (
    <div
      className={`group px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
        isActive
          ? 'bg-blue-50 text-blue-700'
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
      }`}
      onClick={handleClick}
      title={isActive ? 'Click to deselect — start a fresh save' : undefined}
    >
      {editing ? (
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={e => {
            if (e.key === 'Enter') commitRename()
            if (e.key === 'Escape') { setDraft(calc.name); setEditing(false) }
          }}
          autoFocus
          onClick={e => e.stopPropagation()}
          className="w-full bg-white border border-blue-300 text-gray-900 text-xs px-2 py-0.5 rounded focus:outline-none focus:border-blue-500"
        />
      ) : (
        <div className="flex items-center justify-between gap-1 min-w-0">
          <div className="min-w-0 flex-1">
            <p className="text-sm truncate font-medium">{calc.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(calc.updated_at).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric',
              })}
            </p>
          </div>
          <div className="flex items-center gap-0.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={e => { e.stopPropagation(); setEditing(true) }}
              className="flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              title="Rename"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SavedCalculationsSidebar({
  savedCalcs,
  loading,
  error,
  activeSavedCalcId,
  onLoad,
  onDeselect,
  onRename,
  onDelete,
}) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Section header */}
      <div className="px-3 py-2 mt-2">
        <div className="flex items-center gap-2 px-2 mb-1">
          <BookOpen className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Saved</span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-0.5">
        {loading ? (
          <div className="px-2 py-3">
            <p className="text-xs text-gray-400 animate-pulse">Loading…</p>
          </div>
        ) : error ? (
          <div className="px-2 py-3 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs text-red-600 leading-relaxed">{error}</p>
          </div>
        ) : savedCalcs.length === 0 ? (
          <div className="px-2 py-3">
            <p className="text-xs text-gray-400 leading-relaxed">
              No saved calculations yet.
            </p>
          </div>
        ) : (
          savedCalcs.map(calc => (
            <RenameableItem
              key={calc.id}
              calc={calc}
              isActive={calc.id === activeSavedCalcId}
              onLoad={onLoad}
              onDeselect={onDeselect}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  )
}
