import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Save, Check, Plus, Archive, ArchiveRestore } from 'lucide-react'
import NumInput from '../ui/NumInput'
import { fmt } from '../../utils/format'
import { incomeExpenseApi } from '../../api/incomeExpenseApi'
import { describeError } from '../../api/httpClient'
import { activeCategoryOptions, MONTH_NAMES } from './incomeExpenseOptions'

// Monthly entry tab — the bulk-input mode: pick a month, fill each category's
// sum (income + expense sections), save once. One month-column of a bookkeeping
// spreadsheet. Each filled cell is one aggregate source='monthly' transaction
// server-side; clearing a field clears the cell (the PUT replaces the month
// wholesale). Per-category sums of individually-entered transactions are shown
// read-only so nothing gets double-entered.
//
// Categories are the user's own (v0.15.1): add new ones inline, archive ones
// you don't use (recoverable — history keeps aggregating and re-adding the
// same name restores it), restore from the Archived list. Archived categories
// with saved amounts in this month render read-only — the backend preserves
// their rows across saves. See DECISIONS.md § "Income & Expense Tracker".

const money = (n) => fmt(n, { compact: false })
const keyOf = (type, category) => `${type}:${category}`

const SECTIONS = [
  { type: 'income', title: 'Income', accent: 'text-emerald-600', tone: 'emerald' },
  { type: 'expense', title: 'Expenses', accent: 'text-rose-600', tone: 'rose' },
]

const selectClass =
  'px-3 py-2.5 sm:py-2 text-base sm:text-sm text-gray-800 bg-white rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500'

export default function MonthlyEntryPanel({
  availableYears,
  categories,
  onSaveMonth,
  onAddCategory,
  onSetCategoryArchived,
}) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [amounts, setAmounts] = useState({}) // { 'type:category': '123.45' }
  const [manualSums, setManualSums] = useState({ income: {}, expense: {} })
  const [newNames, setNewNames] = useState({ income: '', expense: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const gridRef = useRef(null)

  const options = useMemo(() => activeCategoryOptions(categories), [categories])
  const archivedByType = useMemo(() => {
    const out = { income: [], expense: [] }
    for (const c of categories ?? []) if (c.archived && out[c.type]) out[c.type].push(c)
    return out
  }, [categories])

  const applyState = useCallback((data) => {
    const next = {}
    for (const c of data.cells) {
      const k = keyOf(c.type, c.category)
      // Duplicate rows per cell are only reachable via date edits on the
      // Transactions tab — sum them here; the next save collapses them.
      next[k] = String((Number(next[k]) || 0) + c.amount)
    }
    setAmounts(next)
    setManualSums(data.manual_sums)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      setSaved(false)
      const res = await incomeExpenseApi.getMonth(year, month)
      if (cancelled) return
      if (!res.ok) {
        setError(describeError(res))
        setLoading(false)
        return
      }
      applyState(res.data)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [year, month, applyState])

  function setAmount(type, category, value) {
    setSaved(false)
    setAmounts((prev) => ({ ...prev, [keyOf(type, category)]: value }))
  }

  // Enter advances to the next amount field, spreadsheet-style (Tab already
  // works natively). Delegated on the grid container so NumInput stays generic.
  function handleGridKeyDown(e) {
    if (e.key !== 'Enter' || e.target.tagName !== 'INPUT' || e.target.type !== 'number') return
    e.preventDefault()
    const inputs = Array.from(gridRef.current?.querySelectorAll('input[type="number"]') ?? [])
    const next = inputs[inputs.indexOf(e.target) + 1]
    if (next) next.focus()
  }

  const totals = useMemo(() => {
    const sum = (type) =>
      options[type].reduce((acc, o) => acc + (Number(amounts[keyOf(type, o.value)]) || 0), 0)
    const income = sum('income')
    const expense = sum('expense')
    return { income, expense, net: income - expense }
  }, [amounts, options])

  const manualTotals = useMemo(() => {
    const sum = (type) => Object.values(manualSums[type] ?? {}).reduce((a, b) => a + b, 0)
    return { income: sum('income'), expense: sum('expense') }
  }, [manualSums])

  async function handleSave() {
    setSaving(true)
    setError('')
    const cells = []
    for (const { type } of SECTIONS) {
      for (const o of options[type]) {
        const v = Number(amounts[keyOf(type, o.value)])
        if (v > 0) cells.push({ type, category: o.value, amount: v })
      }
    }
    const res = await onSaveMonth(year, month, cells)
    setSaving(false)
    if (res.success) {
      if (res.data) applyState(res.data)
      setSaved(true)
    } else {
      const flat = res.errors ? Object.values(res.errors).flat() : []
      setError(
        flat.length && flat.every((m) => typeof m === 'string')
          ? flat.join(' ')
          : res.error || 'Could not save.'
      )
    }
  }

  async function handleAddCategory(type) {
    const name = newNames[type].trim()
    if (!name) return
    setError('')
    const res = await onAddCategory(type, name)
    if (res.success) {
      setNewNames((prev) => ({ ...prev, [type]: '' }))
    } else {
      setError(res.error || 'Could not add the category.')
    }
  }

  async function handleArchive(cat, archived) {
    setError('')
    const res = await onSetCategoryArchived(cat.id, archived)
    if (!res.success) setError(res.error || 'Could not update the category.')
  }

  // Year picker: any year with data, plus a window around today so a fresh
  // account can back-fill recent history right away.
  const yearOptions = useMemo(() => {
    const current = now.getFullYear()
    const window = Array.from({ length: 7 }, (_, i) => current - 5 + i)
    return Array.from(new Set([...(availableYears || []), ...window])).sort((a, b) => b - a)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableYears])

  const sectionTotal = (type) => (type === 'income' ? totals.income : totals.expense)
  const manualTotal = (type) => (type === 'income' ? manualTotals.income : manualTotals.expense)

  return (
    <div className="space-y-6">
      {/* Month picker */}
      <div className="bg-white rounded-lg shadow-md p-4 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-gray-600" htmlFor="monthly-entry-month">
          Month
        </label>
        <select
          id="monthly-entry-month"
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className={selectClass}
        >
          {MONTH_NAMES.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <select
          aria-label="Year"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className={selectClass}
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <p className="text-sm text-gray-500 basis-full sm:basis-auto sm:ml-auto">
          Enter each category&apos;s total for the month — Enter/Tab moves to the next field.
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError('')}
            className="font-bold hover:text-red-900"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">Loading…</div>
      ) : (
        <>
          {/* The grid: income + expense sections side by side on desktop */}
          <div
            ref={gridRef}
            onKeyDown={handleGridKeyDown}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start"
          >
            {SECTIONS.map(({ type, title, accent, tone }) => (
              <section key={type} className="bg-white rounded-lg shadow-md p-6">
                <h3 className={`text-lg font-bold mb-4 ${accent}`}>{title}</h3>
                <div className="space-y-3">
                  {options[type].map((o) => {
                    const manual = manualSums[type]?.[o.value]
                    return (
                      <div key={o.value} className="group relative">
                        <NumInput
                          label={o.label}
                          prefix="$"
                          min={0}
                          tone={tone}
                          value={amounts[keyOf(type, o.value)] ?? ''}
                          onChange={(v) => setAmount(type, o.value, v)}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleArchive(
                              categories.find((c) => c.type === type && c.key === o.value),
                              true
                            )
                          }
                          className="absolute right-0 top-0 p-1 text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
                          aria-label={`Archive ${o.label}`}
                          title={`Archive "${o.label}" — recoverable below; its history keeps counting`}
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                        {manual != null && (
                          <p className="mt-1 text-xs text-gray-400">
                            + {money(manual)} already tracked as individual transactions
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Add a category */}
                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    value={newNames[type]}
                    maxLength={60}
                    onChange={(e) => setNewNames((prev) => ({ ...prev, [type]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddCategory(type)
                      }
                    }}
                    placeholder={`New ${type} category…`}
                    aria-label={`New ${type} category name`}
                    className="flex-1 min-w-0 px-3 py-2 text-sm text-gray-800 bg-white rounded-lg border border-dashed border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddCategory(type)}
                    disabled={!newNames[type].trim()}
                    className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>

                {/* Archived categories — recoverable; saved amounts stay read-only */}
                {archivedByType[type].length > 0 && (
                  <div className="mt-4 pt-3 border-t border-dashed border-gray-200">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                      Archived
                    </p>
                    <ul className="space-y-1.5">
                      {archivedByType[type].map((c) => {
                        const savedAmount = Number(amounts[keyOf(type, c.key)])
                        return (
                          <li key={c.id} className="flex items-center gap-2 text-sm text-gray-400">
                            <span className="line-through">{c.name}</span>
                            {savedAmount > 0 && (
                              <span title="Saved amount for this month — preserved; restore the category to edit it">
                                {money(savedAmount)}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleArchive(c, false)}
                              className="ml-auto inline-flex items-center gap-1 text-xs text-gray-400 hover:text-emerald-600"
                              aria-label={`Restore ${c.name}`}
                            >
                              <ArchiveRestore className="w-3.5 h-3.5" />
                              Restore
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}

                <div className="mt-5 pt-4 border-t border-gray-200 flex items-baseline justify-between">
                  <span className="text-sm font-medium text-gray-600">Total {title}</span>
                  <span className={`text-lg font-bold ${accent}`}>
                    {money(sectionTotal(type))}
                    {manualTotal(type) > 0 && (
                      <span className="ml-1 text-xs font-normal text-gray-400">
                        + {money(manualTotal(type))} individual
                      </span>
                    )}
                  </span>
                </div>
              </section>
            ))}
          </div>

          {/* Net + save */}
          <div className="bg-white rounded-lg shadow-md p-6 flex flex-wrap items-center gap-4">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-gray-600">
                Net — {MONTH_NAMES[month - 1]} {year}
              </span>
              <span
                className={`text-xl font-bold ${totals.net < 0 ? 'text-rose-600' : 'text-emerald-600'}`}
              >
                {money(totals.net)}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              {saved && (
                <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
                  <Check className="w-4 h-4" />
                  Saved
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 sm:py-2 rounded-lg hover:bg-emerald-700 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save month'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
