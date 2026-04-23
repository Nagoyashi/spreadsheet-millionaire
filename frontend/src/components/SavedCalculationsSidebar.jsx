import { useState } from 'react'

// Inline rename: click the name → editable input → blur/enter saves via onRename
function RenameableItem({ calc, isActive, onLoad, onRename, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(calc.name)
  const [deleting, setDeleting] = useState(false)

  function commitRename() {
    setEditing(false)
    if (draft.trim() && draft.trim() !== calc.name) {
      onRename(calc.id, draft.trim())
    } else {
      setDraft(calc.name) // reset if empty or unchanged
    }
  }

  async function handleDelete(e) {
    e.stopPropagation()
    setDeleting(true)
    await onDelete(calc.id)
    // Component unmounts on success; setDeleting(false) only needed on error
    setDeleting(false)
  }

  return (
    <div
      className={`group px-4 py-3 border-b border-stone-800 cursor-pointer transition-colors ${
        isActive
          ? 'bg-amber-400/10 border-l-2 border-l-amber-400'
          : 'hover:bg-stone-800/50 border-l-2 border-l-transparent'
      }`}
      onClick={() => !editing && onLoad(calc)}
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
          className="w-full bg-stone-800 border border-amber-400/50 text-stone-100 font-body text-sm px-2 py-0.5 focus:outline-none"
        />
      ) : (
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={`font-body text-sm truncate ${isActive ? 'text-amber-400' : 'text-stone-200'}`}>
              {calc.name}
            </p>
            <p className="font-mono text-xs text-stone-600 mt-0.5">
              {new Date(calc.updated_at).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric', year: 'numeric'
              })}
            </p>
          </div>
          {/* Actions — visible on hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={e => { e.stopPropagation(); setEditing(true) }}
              className="font-mono text-xs text-stone-500 hover:text-stone-300 px-1 py-0.5 transition-colors"
              title="Rename"
            >
              ✎
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="font-mono text-xs text-stone-500 hover:text-red-400 px-1 py-0.5 transition-colors disabled:opacity-40"
              title="Delete"
            >
              ✕
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
  activeSavedCalcId,
  onLoad,
  onRename,
  onDelete,
}) {
  return (
    <aside className="w-64 shrink-0 border-l border-stone-800 bg-stone-900/50 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-stone-800">
        <p className="font-mono text-xs text-stone-500 uppercase tracking-widest">
          Saved
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="px-4 py-6 text-center">
            <p className="font-mono text-xs text-stone-600 animate-pulse tracking-widest">
              LOADING…
            </p>
          </div>
        ) : savedCalcs.length === 0 ? (
          <div className="px-4 py-6">
            <p className="font-body text-xs text-stone-600 leading-relaxed">
              No saved calculations yet. Hit <span className="text-amber-400">Save</span> to keep your work.
            </p>
          </div>
        ) : (
          savedCalcs.map(calc => (
            <RenameableItem
              key={calc.id}
              calc={calc}
              isActive={calc.id === activeSavedCalcId}
              onLoad={onLoad}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </aside>
  )
}
