import { useState, useEffect, useMemo } from 'react'
import {
  Pencil,
  Trash2,
  Plus,
  X,
  Repeat,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import NumInput from '../ui/NumInput'
import { fmt } from '../../utils/format'
import {
  TYPE_OPTIONS,
  activeCategoryOptions,
  categoryLabel,
  RECURRENCE_UNIT_OPTIONS,
  recurrenceLabel,
  MONTH_NAMES,
} from './incomeExpenseOptions'

// Transactions tab, top to bottom: filters → the add/edit form → the paginated
// table (v0.15.2 layout — the form sits above the list so adding never means
// scrolling past every row). Server-side filtering (year/month) goes through
// the hook's setFilters; type/category/amount/date-range filters slice the
// fetched list client-side. Category options come from the user's own active
// categories; archived/legacy keys on existing rows still label via
// categoryLabel.

const money = (n) => fmt(n, { compact: false })
const PAGE_SIZE = 30

const selectClass =
  'w-full px-3 py-2.5 sm:py-2 text-base sm:text-sm text-gray-800 bg-white rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500'

export default function TransactionsPanel({
  transactions,
  categories,
  filters,
  setFilters,
  availableYears,
  onAdd,
  onUpdate,
  onDelete,
}) {
  const options = activeCategoryOptions(categories)
  const emptyForm = () => ({
    type: 'expense',
    category: options.expense[0]?.value ?? '',
    amount: '',
    occurred_on: '',
    note: '',
    recurrence_unit: 'none',
    recurrence_interval: '1',
  })
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Client-side list filters (the year/month pair is server-side via setFilters).
  const [typeFilter, setTypeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  function setField(name, value) {
    setForm((prev) => {
      const next = { ...prev, [name]: value }
      // Switching type invalidates the category — reset to the new type's first.
      if (name === 'type') next.category = options[value][0]?.value ?? ''
      return next
    })
  }

  function reset() {
    setForm(emptyForm())
    setEditingId(null)
    setFormError('')
  }

  function startEdit(t) {
    setForm({
      type: t.type,
      category: t.category,
      amount: String(t.amount),
      occurred_on: t.occurred_on,
      note: t.note ?? '',
      recurrence_unit: t.recurrence_unit ?? 'none',
      recurrence_interval: String(t.recurrence_interval ?? 1),
    })
    setEditingId(t.id)
    setFormError('')
  }

  const canSubmit = form.type && form.category && form.amount !== '' && form.occurred_on

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setFormError('')
    const repeats = form.recurrence_unit !== 'none'
    const payload = {
      type: form.type,
      category: form.category,
      amount: Number(form.amount),
      occurred_on: form.occurred_on,
      ...(form.note ? { note: form.note } : {}),
      // Always send recurrence so an edit can clear/change it (the PUT is partial;
      // omitting it would leave a stale rule in place). Interval only matters when
      // it repeats — the backend normalises a one-off back to interval 1.
      recurrence_unit: form.recurrence_unit,
      recurrence_interval: repeats ? Math.max(1, Number(form.recurrence_interval) || 1) : 1,
    }
    const res = editingId ? await onUpdate(editingId, payload) : await onAdd(payload)
    setSubmitting(false)
    if (res.success) {
      reset()
    } else {
      setFormError(
        res.errors ? Object.values(res.errors).flat().join(' ') : res.error || 'Could not save.'
      )
    }
  }

  async function handleDelete(t) {
    if (!window.confirm('Delete this transaction?')) return
    await onDelete(t.id)
    if (editingId === t.id) reset()
  }

  const visible = useMemo(() => {
    const min = amountMin === '' ? null : Number(amountMin)
    const max = amountMax === '' ? null : Number(amountMax)
    return transactions.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false
      const amount = Number(t.amount)
      if (min != null && Number.isFinite(min) && amount < min) return false
      if (max != null && Number.isFinite(max) && amount > max) return false
      // occurred_on is ISO YYYY-MM-DD — string comparison is date comparison.
      if (dateFrom && t.occurred_on < dateFrom) return false
      if (dateTo && t.occurred_on > dateTo) return false
      return true
    })
  }, [transactions, typeFilter, categoryFilter, amountMin, amountMax, dateFrom, dateTo])

  // Pagination — 30 rows per page; any filter change snaps back to page 1.
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  useEffect(() => {
    setPage(1)
  }, [transactions, typeFilter, categoryFilter, amountMin, amountMax, dateFrom, dateTo])
  const safePage = Math.min(page, totalPages)
  const pageRows = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const yearOptions = Array.from(new Set([...(availableYears || [])])).sort((a, b) => b - a)

  // Category filter options: the chosen type's categories, or both types'
  // (deduped by key so 'Other' doesn't appear twice) when type is 'all'.
  const categoryFilterOptions = useMemo(() => {
    const seen = new Set()
    const out = []
    const types = typeFilter === 'all' ? ['expense', 'income'] : [typeFilter]
    for (const type of types) {
      for (const c of (categories ?? []).filter((c) => c.type === type)) {
        if (seen.has(c.key)) continue
        seen.add(c.key)
        out.push({ value: c.key, label: c.name })
      }
    }
    return out
  }, [categories, typeFilter])

  const anyExtraFilter =
    typeFilter !== 'all' || categoryFilter !== 'all' || amountMin || amountMax || dateFrom || dateTo

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-wrap gap-3">
          <select
            value={filters.year ?? ''}
            onChange={(e) =>
              setFilters({ ...filters, year: e.target.value ? Number(e.target.value) : undefined })
            }
            className={`${selectClass} sm:w-auto`}
          >
            <option value="">All years</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            value={filters.month ?? ''}
            onChange={(e) =>
              setFilters({ ...filters, month: e.target.value ? Number(e.target.value) : undefined })
            }
            className={`${selectClass} sm:w-auto`}
          >
            <option value="">All months</option>
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value)
              setCategoryFilter('all') // the category set follows the type
            }}
            className={`${selectClass} sm:w-auto`}
          >
            <option value="all">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={`${selectClass} sm:w-auto`}
            aria-label="Category filter"
          >
            <option value="all">All categories</option>
            {categoryFilterOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={amountMin}
              onChange={(e) => setAmountMin(e.target.value.replace(',', '.'))}
              placeholder="Min $"
              aria-label="Minimum amount"
              className={`${selectClass} w-24`}
            />
            <span className="text-gray-400 text-sm">–</span>
            <input
              type="text"
              inputMode="decimal"
              value={amountMax}
              onChange={(e) => setAmountMax(e.target.value.replace(',', '.'))}
              placeholder="Max $"
              aria-label="Maximum amount"
              className={`${selectClass} w-24`}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="From date"
              className={`${selectClass} sm:w-auto`}
            />
            <span className="text-gray-400 text-sm">–</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="To date"
              className={`${selectClass} sm:w-auto`}
            />
          </div>
          {anyExtraFilter && (
            <button
              type="button"
              onClick={() => {
                setTypeFilter('all')
                setCategoryFilter('all')
                setAmountMin('')
                setAmountMax('')
                setDateFrom('')
                setDateTo('')
              }}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
            >
              <X className="w-4 h-4" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Add / edit form — above the list so adding never means scrolling */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">
            {editingId ? 'Edit transaction' : 'Add transaction'}
          </h3>
          {editingId && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
            >
              <X className="w-4 h-4" />
              Cancel edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => setField('type', e.target.value)}
              className={selectClass}
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => setField('category', e.target.value)}
              className={selectClass}
            >
              {options[form.type].map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <NumInput
            label="Amount"
            prefix="$"
            min={0}
            value={form.amount}
            onChange={(v) => setField('amount', v)}
          />
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Date</label>
            <input
              type="date"
              value={form.occurred_on}
              onChange={(e) => setField('occurred_on', e.target.value)}
              className={selectClass}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="block text-sm font-medium text-gray-600 mb-1">Note</label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setField('note', e.target.value)}
              className={selectClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Repeat</label>
            <select
              value={form.recurrence_unit}
              onChange={(e) => setField('recurrence_unit', e.target.value)}
              className={selectClass}
            >
              {RECURRENCE_UNIT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {form.recurrence_unit !== 'none' && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Repeat every</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={form.recurrence_interval}
                  onChange={(e) => setField('recurrence_interval', e.target.value)}
                  className={`${selectClass} w-20`}
                />
                <span className="text-sm text-gray-600">
                  {Number(form.recurrence_interval) === 1
                    ? form.recurrence_unit
                    : `${form.recurrence_unit}s`}
                </span>
              </div>
            </div>
          )}
        </div>

        {formError && <p className="mt-4 text-sm text-red-600">{formError}</p>}

        <div className="mt-5">
          <button
            type="submit"
            disabled={submitting || !canSubmit}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 sm:py-2 rounded-lg hover:bg-emerald-700 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            {submitting ? 'Saving…' : editingId ? 'Save changes' : 'Add'}
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {visible.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500">
            No transactions{anyExtraFilter ? ' match these filters' : ' — add one above'}.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">Note</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageRows.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-800">{t.occurred_on}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          t.type === 'income'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-800">
                      <span className="inline-flex items-center gap-1.5">
                        {categoryLabel(t.type, t.category, categories)}
                        {t.source === 'monthly' && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-amber-100 text-amber-700"
                            title="Aggregate row saved from the Monthly entry grid — editing or deleting it here updates the grid too"
                          >
                            <CalendarDays className="w-3 h-3" />
                            Monthly entry
                          </span>
                        )}
                        {t.recurrence_unit && t.recurrence_unit !== 'none' && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-indigo-100 text-indigo-700"
                            title={recurrenceLabel(t.recurrence_unit, t.recurrence_interval)}
                          >
                            <Repeat className="w-3 h-3" />
                            {recurrenceLabel(t.recurrence_unit, t.recurrence_interval)}
                          </span>
                        )}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 text-right whitespace-nowrap font-semibold ${
                        t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {t.type === 'income' ? '+' : '−'}
                      {money(t.amount)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[16rem] truncate">
                      {t.note || '—'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => startEdit(t)}
                        className="text-gray-400 hover:text-emerald-600 transition mr-3"
                        aria-label="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(t)}
                        className="text-gray-400 hover:text-red-600 transition"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination — 30 per page */}
        {totalPages > 1 && (
          <nav
            className="flex items-center justify-between border-t border-gray-200 px-4 py-3"
            aria-label="Transaction pages"
          >
            <span className="text-xs text-gray-500">
              {visible.length} transactions · page {safePage} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="p-1.5 text-gray-500 hover:text-gray-800 disabled:opacity-30"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={`min-w-[2rem] px-2 py-1 text-sm rounded-md ${
                    n === safePage
                      ? 'bg-emerald-600 text-white font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  aria-current={n === safePage ? 'page' : undefined}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="p-1.5 text-gray-500 hover:text-gray-800 disabled:opacity-30"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </nav>
        )}
      </div>
    </div>
  )
}
