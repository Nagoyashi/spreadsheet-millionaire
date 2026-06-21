import { useState } from 'react'
import { Pencil, Trash2, Plus, X } from 'lucide-react'
import NumInput from '../ui/NumInput'
import { fmt } from '../../utils/format'
import { TYPE_OPTIONS, CATEGORY_OPTIONS, categoryLabel } from './incomeExpenseOptions'

// Transactions tab — year/month/type filters + a table + an add/edit form.
// Category options depend on the selected type, so this is a dedicated form
// (not the generic CategoryManager). Server-side filtering (year/month) goes
// through the hook's setFilters; the type filter is client-side.

const money = (n) => fmt(n, { compact: false })
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const emptyForm = () => ({
  type: 'expense',
  category: CATEGORY_OPTIONS.expense[0].value,
  amount: '',
  occurred_on: '',
  note: '',
})

const selectClass =
  'w-full px-3 py-2.5 sm:py-2 text-base sm:text-sm text-gray-800 bg-white rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500'

export default function TransactionsPanel({
  transactions,
  filters,
  setFilters,
  availableYears,
  onAdd,
  onUpdate,
  onDelete,
}) {
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [typeFilter, setTypeFilter] = useState('all')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  function setField(name, value) {
    setForm((prev) => {
      const next = { ...prev, [name]: value }
      // Switching type invalidates the category — reset to the new type's first.
      if (name === 'type') next.category = CATEGORY_OPTIONS[value][0].value
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
    const payload = {
      type: form.type,
      category: form.category,
      amount: Number(form.amount),
      occurred_on: form.occurred_on,
      ...(form.note ? { note: form.note } : {}),
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

  const visible =
    typeFilter === 'all' ? transactions : transactions.filter((t) => t.type === typeFilter)
  const yearOptions = Array.from(new Set([...(availableYears || [])])).sort((a, b) => b - a)

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="bg-white rounded-lg shadow-md p-4 flex flex-wrap gap-3">
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
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className={`${selectClass} sm:w-auto`}
        >
          <option value="all">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {visible.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500">
            No transactions{typeFilter !== 'all' ? ` of this type` : ''} — add one below.
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
                {visible.map((t) => (
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
                    <td className="px-4 py-3 text-gray-800">{categoryLabel(t.type, t.category)}</td>
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
      </div>

      {/* Add / edit form */}
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
              {CATEGORY_OPTIONS[form.type].map((o) => (
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
    </div>
  )
}
