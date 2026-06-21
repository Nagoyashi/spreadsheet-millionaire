import { useState } from 'react'
import { Pencil, Trash2, Plus, X } from 'lucide-react'
import NumInput from '../ui/NumInput'
import { buildPayload, canSubmit, initialForm, formFromRow, formatCell } from './managerHelpers'

// Generic add/edit form + table for one Net Worth category. Driven entirely by a
// config from categories.js (fields + columns), so all five tabs share one
// correct implementation. CRUD goes through the callbacks WealthPage wires to
// useNetWorthData; each returns { success, error?, errors? } (never throws).

export default function CategoryManager({ config, items, onAdd, onUpdate, onDelete }) {
  const { title, fields, columns, fixed = {} } = config

  const [form, setForm] = useState(() => initialForm(fields))
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function resetForm() {
    setForm(initialForm(fields))
    setEditingId(null)
    setFormError('')
  }

  function startEdit(row) {
    setForm(formFromRow(fields, row))
    setEditingId(row.id)
    setFormError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit(fields, form)) return
    setSubmitting(true)
    setFormError('')

    const payload = buildPayload(fields, form, fixed)
    const result = editingId ? await onUpdate(editingId, payload) : await onAdd(payload)

    setSubmitting(false)
    if (result.success) {
      resetForm()
    } else {
      // Prefer field-level validation messages from the backend, else the
      // transport/summary message.
      const fieldMsg = result.errors ? Object.values(result.errors).flat().join(' ') : null
      setFormError(fieldMsg || result.error || 'Could not save.')
    }
  }

  async function handleDelete(row) {
    if (!window.confirm(`Delete "${row.name || row.ticker || row.property_name}"?`)) return
    await onDelete(row.id)
    if (editingId === row.id) resetForm()
  }

  return (
    <div className="space-y-6">
      {/* Table / empty state */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {items.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500">
            No {title.toLowerCase()} yet — add your first below.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  {columns.map((col) => (
                    <th key={col.key} className="px-4 py-3 font-medium whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 whitespace-nowrap text-gray-800">
                        {formatCell(row[col.key], col.format, col.options)}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => startEdit(row)}
                        className="text-gray-400 hover:text-indigo-600 transition mr-3"
                        aria-label="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(row)}
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
            {editingId
              ? `Edit ${title.toLowerCase().replace(/s$/, '')}`
              : `Add ${title.toLowerCase().replace(/s$/, '')}`}
          </h3>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
            >
              <X className="w-4 h-4" />
              Cancel edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {fields.map((f) => {
            if (f.type === 'number') {
              return (
                <NumInput
                  key={f.name}
                  label={f.label}
                  hint={f.hint}
                  prefix={f.prefix}
                  suffix={f.suffix}
                  min={f.min}
                  value={form[f.name]}
                  onChange={(v) => setField(f.name, v)}
                />
              )
            }
            return (
              <div key={f.name}>
                <label className="block text-sm font-medium text-gray-600 mb-1">{f.label}</label>
                {f.type === 'select' ? (
                  <select
                    value={form[f.name]}
                    onChange={(e) => setField(f.name, e.target.value)}
                    className="w-full px-3 py-2.5 sm:py-2 text-base sm:text-sm text-gray-800 bg-white rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {f.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type === 'date' ? 'date' : 'text'}
                    value={form[f.name]}
                    onChange={(e) => setField(f.name, e.target.value)}
                    className="w-full px-3 py-2.5 sm:py-2 text-base sm:text-sm text-gray-800 bg-white rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            )
          })}
        </div>

        {formError && <p className="mt-4 text-sm text-red-600">{formError}</p>}

        <div className="mt-5">
          <button
            type="submit"
            disabled={submitting || !canSubmit(fields, form)}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 sm:py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            {submitting ? 'Saving…' : editingId ? 'Save changes' : `Add`}
          </button>
        </div>
      </form>
    </div>
  )
}
