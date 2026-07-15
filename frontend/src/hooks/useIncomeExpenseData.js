import { useState, useEffect, useCallback } from 'react'
import { incomeExpenseApi } from '../api/incomeExpenseApi'
import { describeError } from '../api/httpClient'
import { analytics } from '../api/analytics'

// Income & Expense data layer — fetches transactions (filtered by the selected
// year/month) and the summary (for the selected year), and exposes CRUD methods
// that refetch on success so the summary stays in sync. Filters live here;
// setFilters triggers a refetch. Reads only run for authenticated users.

export function useIncomeExpenseData(isAuthenticated) {
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState(null)
  const [categories, setCategories] = useState([]) // user-scoped, incl. archived
  const [filters, setFilters] = useState({}) // { year?, month? }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // `background` skips the loading flip: mutations refetch silently so the tab
  // panels stay MOUNTED — flipping `loading` unmounts them, which wiped a
  // user's unsaved grid amounts when they added a category mid-entry (#v0.15.2).
  const fetchAll = useCallback(
    async (background = false) => {
      if (!isAuthenticated) {
        setLoading(false)
        return
      }
      if (!background) setLoading(true)
      setError('')

      const [txns, sum, cats] = await Promise.all([
        incomeExpenseApi.listTransactions(filters),
        incomeExpenseApi.getSummary(filters.year),
        incomeExpenseApi.listCategories(),
      ])

      const failed = [txns, sum, cats].find((r) => !r.ok)
      if (failed) {
        setError(describeError(failed))
        setLoading(false)
        return
      }

      setTransactions(txns.data.items)
      setSummary(sum.data)
      setCategories(cats.data.items)
      setLoading(false)
    },
    [isAuthenticated, filters]
  )

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const mutate = useCallback(
    async (fn) => {
      const res = await fn()
      if (!res.ok) {
        return { success: false, error: describeError(res), errors: res.data?.errors }
      }
      await fetchAll(true) // background — keep panels mounted (unsaved grid input survives)
      return { success: true, item: res.data?.item, data: res.data }
    },
    [fetchAll]
  )

  return {
    transactions,
    summary,
    categories,
    filters,
    setFilters,
    loading,
    error,
    setError,
    refresh: fetchAll,

    // Funnel: the first successful transaction is this tracker's activation
    // moment. trackerFirstEntry is one-shot, so only the first ever fires.
    addTransaction: (body) =>
      mutate(() => incomeExpenseApi.createTransaction(body)).then((result) => {
        if (result.success) analytics.trackerFirstEntry('income-expenses')
        return result
      }),
    updateTransaction: (id, body) => mutate(() => incomeExpenseApi.updateTransaction(id, body)),
    deleteTransaction: (id) => mutate(() => incomeExpenseApi.removeTransaction(id)),

    // Monthly grid save — replaces one month's aggregate rows wholesale, then
    // refetches so the summary/transactions stay in sync. A non-empty save is
    // an activation moment too (trackerFirstEntry is one-shot server-side).
    saveMonth: (year, month, cells) =>
      mutate(() => incomeExpenseApi.putMonth(year, month, cells)).then((result) => {
        if (result.success && cells.length > 0) analytics.trackerFirstEntry('income-expenses')
        return result
      }),

    // Categories (v0.15.1; rename/reorder v0.15.2). 409s (duplicate name,
    // category limit, stale order) surface through mutate's error path.
    addCategory: (type, name) => mutate(() => incomeExpenseApi.createCategory({ type, name })),
    setCategoryArchived: (id, archived) =>
      mutate(() => incomeExpenseApi.patchCategory(id, { archived })),
    renameCategory: (id, name) => mutate(() => incomeExpenseApi.patchCategory(id, { name })),
    reorderCategories: (type, ids) => mutate(() => incomeExpenseApi.reorderCategories(type, ids)),
  }
}
