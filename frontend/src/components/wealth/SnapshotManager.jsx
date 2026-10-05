import { useState } from 'react'
import { Pencil, Trash2, X, Check } from 'lucide-react'
import { fmt } from '../../utils/format'

// Manage the snapshot history behind the Net Worth Over Time chart: edit a past
// snapshot's date/totals (net worth is recomputed server-side) or delete a bad
// point — the fix for "I deleted an item by accident, snapshotted, and now the
// trend shows a dip forever" (#318). Delete uses the in-app two-step confirm
// (never window.confirm — see #284).

const money = (n) => fmt(n, { compact: false })

export default function SnapshotManager({ snapshots, onUpdate, onDelete }) {
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({})
  const [confirmingId, setConfirmingId] = useState(null)
  const [busy, setBusy] = useState(false)

  if (!snapshots.length) return null

  // Latest first — corrections almost always target recent points.
  const rows = [...snapshots].sort((a, b) => (a.snapshot_date < b.snapshot_date ? 1 : -1))

  function startEdit(snap) {
    setConfirmingId(null)
    setEditingId(snap.id)
    setForm({
      snapshot_date: snap.snapshot_date,
      total_assets: String(snap.total_assets),
      total_liabilities: String(snap.total_liabilities),
    })
  }

  async function saveEdit(id) {
    setBusy(true)
    try {
      await onUpdate(id, form)
      setEditingId(null)
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete(id) {
    setBusy(true)
    try {
      await onDelete(id)
      setConfirmingId(null)
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'w-full px-2 py-1 text-xs text-gray-700 bg-white rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-400'

  return (
    <div className="mt-4 border-t border-gray-100 pt-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
        Manage snapshots
      </p>
      <ul className="space-y-1 max-h-56 overflow-y-auto pr-1">
        {rows.map((snap) =>
          editingId === snap.id ? (
            <li
              key={snap.id}
              className="grid grid-cols-2 sm:grid-cols-[auto_1fr_1fr_auto] items-center gap-2 rounded-lg bg-indigo-50/60 px-2 py-1.5"
            >
              <input
                type="date"
                aria-label="Snapshot date"
                value={form.snapshot_date}
                onChange={(e) => setForm((f) => ({ ...f, snapshot_date: e.target.value }))}
                className={inputCls}
              />
              <input
                type="number"
                min="0"
                aria-label="Total assets"
                value={form.total_assets}
                onChange={(e) => setForm((f) => ({ ...f, total_assets: e.target.value }))}
                className={inputCls}
              />
              <input
                type="number"
                min="0"
                aria-label="Total liabilities"
                value={form.total_liabilities}
                onChange={(e) => setForm((f) => ({ ...f, total_liabilities: e.target.value }))}
                className={inputCls}
              />
              <span className="flex items-center gap-1 justify-end">
                <button
                  onClick={() => saveEdit(snap.id)}
                  disabled={busy}
                  aria-label="Save snapshot"
                  className="p-1 rounded text-emerald-600 hover:bg-emerald-100 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  disabled={busy}
                  aria-label="Cancel edit"
                  className="p-1 rounded text-gray-400 hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </span>
            </li>
          ) : (
            <li
              key={snap.id}
              className="group flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50"
            >
              <span className="text-xs text-gray-500 tabular-nums">{snap.snapshot_date}</span>
              <span className="text-xs font-medium text-gray-700 tabular-nums ml-auto">
                {money(snap.net_worth)}
              </span>
              {confirmingId === snap.id ? (
                <span className="flex items-center gap-1">
                  <button
                    onClick={() => confirmDelete(snap.id)}
                    disabled={busy}
                    className="text-xs font-medium text-red-600 hover:text-red-700 px-1.5 py-0.5 rounded bg-red-50 disabled:opacity-50"
                  >
                    Delete?
                  </button>
                  <button
                    onClick={() => setConfirmingId(null)}
                    disabled={busy}
                    className="text-xs text-gray-500 hover:text-gray-700 px-1"
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(snap)}
                    aria-label="Edit snapshot"
                    className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmingId(snap.id)}
                    aria-label="Delete snapshot"
                    className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}
            </li>
          )
        )}
      </ul>
    </div>
  )
}
