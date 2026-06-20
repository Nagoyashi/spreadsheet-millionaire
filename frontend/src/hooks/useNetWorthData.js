import { useState, useEffect, useCallback } from 'react'
import { netWorthApi } from '../api/netWorthApi'
import { describeError } from '../api/httpClient'

// Net Worth data layer — fetches all four resources + the aggregated summary +
// snapshots, and exposes CRUD methods that refetch on success so the summary
// (computed server-side) always reflects the latest rows.
//
// Every mutation returns { success, error?, errors?, item? } so forms can show
// validation errors (422 -> data.errors) without throwing — httpClient never
// rejects. Reads only run for authenticated users (the API is login-gated).

export function useNetWorthData(isAuthenticated) {
  const [assets, setAssets] = useState([])
  const [liabilities, setLiabilities] = useState([])
  const [investments, setInvestments] = useState([])
  const [properties, setProperties] = useState([]) // real-estate
  const [summary, setSummary] = useState(null)
  const [snapshots, setSnapshots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchAll = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')

    const results = await Promise.all([
      netWorthApi.assets.list(),
      netWorthApi.liabilities.list(),
      netWorthApi.investments.list(),
      netWorthApi.realEstate.list(),
      netWorthApi.getSummary(),
      netWorthApi.snapshots.list(),
    ])

    const failed = results.find((r) => !r.ok)
    if (failed) {
      setError(describeError(failed))
      setLoading(false)
      return
    }

    const [a, l, i, r, s, snap] = results
    setAssets(a.data.items)
    setLiabilities(l.data.items)
    setInvestments(i.data.items)
    setProperties(r.data.items)
    setSummary(s.data)
    setSnapshots(snap.data.items)
    setLoading(false)
  }, [isAuthenticated])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Run a mutation, surface validation/transport errors, and refetch on success.
  const mutate = useCallback(
    async (fn) => {
      const res = await fn()
      if (!res.ok) {
        return { success: false, error: describeError(res), errors: res.data?.errors }
      }
      await fetchAll()
      return { success: true, item: res.data?.item }
    },
    [fetchAll]
  )

  return {
    // Data
    assets,
    liabilities,
    investments,
    properties,
    summary,
    snapshots,

    // State
    loading,
    error,
    setError,
    refresh: fetchAll,

    // Assets
    addAsset: (body) => mutate(() => netWorthApi.assets.create(body)),
    updateAsset: (id, body) => mutate(() => netWorthApi.assets.update(id, body)),
    deleteAsset: (id) => mutate(() => netWorthApi.assets.remove(id)),

    // Liabilities
    addLiability: (body) => mutate(() => netWorthApi.liabilities.create(body)),
    updateLiability: (id, body) => mutate(() => netWorthApi.liabilities.update(id, body)),
    deleteLiability: (id) => mutate(() => netWorthApi.liabilities.remove(id)),

    // Investments
    addInvestment: (body) => mutate(() => netWorthApi.investments.create(body)),
    updateInvestment: (id, body) => mutate(() => netWorthApi.investments.update(id, body)),
    deleteInvestment: (id) => mutate(() => netWorthApi.investments.remove(id)),

    // Real estate
    addProperty: (body) => mutate(() => netWorthApi.realEstate.create(body)),
    updateProperty: (id, body) => mutate(() => netWorthApi.realEstate.update(id, body)),
    deleteProperty: (id) => mutate(() => netWorthApi.realEstate.remove(id)),

    // Snapshots
    createSnapshot: (body) => mutate(() => netWorthApi.snapshots.create(body)),
  }
}
