import { useState } from 'react'
import { Pencil, Ban, Repeat } from 'lucide-react'
import { fmt } from '../../utils/format'
import { recurrenceLabel } from './incomeExpenseOptions'
import { nextOccurrence } from './recurrence'

// The at-a-glance list of every recurring rule (#317), shown on the Overview
// tab so recurring commitments are visible right away. Each row: cadence, next
// occurrence, and two actions — Edit (jumps to the Transactions form) and Stop
// (sets the rule back to a one-off; the row itself stays, history is real
// data). Stop uses the in-app two-step confirm (never window.confirm — #284).

const money = (n) => fmt(n, { compact: false })

export default function RecurringPanel({ transactions = [], onUpdate, onEdit }) {
  const [confirmingId, setConfirmingId] = useState(null)
  const [busy, setBusy] = useState(false)

  const recurring = transactions
    .filter((t) => t.recurrence_unit && t.recurrence_unit !== 'none')
    .sort((a, b) => (a.occurred_on < b.occurred_on ? 1 : -1))

  if (!recurring.length) return null

  const todayIso = new Date().toISOString().slice(0, 10)

  async function stopRule(t) {
    setBusy(true)
    try {
      // A one-off keeps the anchor row as real history; only projections stop.
      await onUpdate(t.id, { recurrence_unit: 'none', recurrence_interval: 1 })
      setConfirmingId(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-4">
        <Repeat className="w-4 h-4 text-indigo-500" />
        <h3 className="text-lg font-bold text-gray-800">Recurring</h3>
        <span className="text-xs text-gray-400">
          {recurring.length} active rule{recurring.length === 1 ? '' : 's'}
        </span>
      </div>
      <ul className="divide-y divide-gray-100">
        {recurring.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 group">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                t.type === 'income' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
              }`}
            >
              {t.type === 'income' ? '+' : '−'}
              {money(t.amount)}
            </span>
            <span className="text-sm text-gray-700 font-medium">{t.category}</span>
            {t.note && (
              <span className="text-xs text-gray-400 truncate max-w-[16ch]">{t.note}</span>
            )}
            <span className="text-xs text-gray-500 ml-auto">
              {recurrenceLabel(t.recurrence_unit, t.recurrence_interval)}
            </span>
            <span className="text-xs text-gray-400 tabular-nums">
              next{' '}
              {nextOccurrence(t.occurred_on, t.recurrence_unit, t.recurrence_interval, todayIso)}
            </span>
            {confirmingId === t.id ? (
              <span className="flex items-center gap-1">
                <button
                  onClick={() => stopRule(t)}
                  disabled={busy}
                  className="text-xs font-medium text-red-600 hover:text-red-700 px-1.5 py-0.5 rounded bg-red-50 disabled:opacity-50"
                >
                  Stop repeating?
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
              <span className="flex items-center gap-0.5">
                <button
                  onClick={() => onEdit(t)}
                  aria-label="Edit recurring transaction"
                  className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setConfirmingId(t.id)}
                  aria-label="Stop recurring transaction"
                  className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
                >
                  <Ban className="w-3.5 h-3.5" />
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
