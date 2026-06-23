// Pure derivation helpers for the Net Worth Overview.
//
// Everything here is read-side: it derives from data the page already holds (the
// server `summary`, the `snapshots` history, and the live asset/liability/
// property rows). No persisted shape changes. Gain formulas mirror the backend
// summary computation EXACTLY (backend/models/net_worth.py) so per-item figures
// reconcile with the aggregate "lifetime gain / return".

// ── Per-item gain/loss ────────────────────────────────────────────────────────
// Liquid + collectible assets: value minus stored cost basis.
export function assetGain(row) {
  return Number(row.current_value || 0) - Number(row.cost_basis || 0)
}

// Investments: market value (explicit current_value, else quantity × unit cost)
// minus total cost basis (quantity × unit cost). Matches the summary's
// `CASE WHEN current_value > 0 THEN current_value ELSE quantity*cost_basis END`.
export function investmentGain(row) {
  const totalCost = Number(row.quantity || 0) * Number(row.cost_basis || 0)
  const marketValue = Number(row.current_value) > 0 ? Number(row.current_value) : totalCost
  return marketValue - totalCost
}

// Real estate: value minus purchase price (mortgage is a liability, not a
// reduction to the asset, per the backend).
export function propertyGain(row) {
  return Number(row.current_value || 0) - Number(row.purchase_price || 0)
}

// ── Debt-to-asset ratio ───────────────────────────────────────────────────────
// Total liabilities as a percentage of total assets. Null when there are no
// assets (the ratio is undefined / would divide by zero).
export function debtToAssetRatio(summary) {
  if (!summary || !(summary.total_assets > 0)) return null
  return (summary.total_liabilities / summary.total_assets) * 100
}

// ── Snapshot delta ────────────────────────────────────────────────────────────
// Change in net worth between the two most recent snapshots (the list arrives
// date-ascending). Returns null until at least two snapshots exist.
export function snapshotDelta(snapshots = []) {
  if (snapshots.length < 2) return null
  const last = snapshots[snapshots.length - 1]
  const prev = snapshots[snapshots.length - 2]
  return Number(last.net_worth) - Number(prev.net_worth)
}

// ── Liabilities breakdown ─────────────────────────────────────────────────────
// What the total liabilities are composed of. The `liabilities` rows carry a
// `liability_type`, but the summary's total_liabilities ALSO folds in real-estate
// mortgage balances — so a "Mortgages" slice is derived from `properties` to keep
// the breakdown reconciled with total_liabilities. Returns [{ key, label, value }]
// sorted high→low, omitting zero slices.
const LIABILITY_TYPE_LABELS = {
  credit_card: 'Credit cards',
  loan: 'Loans',
  other: 'Other',
}

export function liabilitiesBreakdown(liabilities = [], properties = []) {
  const totals = new Map()
  for (const l of liabilities) {
    const key = l.liability_type
    totals.set(key, (totals.get(key) ?? 0) + Number(l.current_balance || 0))
  }

  const mortgages = properties.reduce((sum, p) => sum + Number(p.mortgage_balance || 0), 0)
  if (mortgages > 0) totals.set('mortgages', mortgages)

  return [...totals.entries()]
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({
      key,
      label: key === 'mortgages' ? 'Mortgages' : (LIABILITY_TYPE_LABELS[key] ?? key),
      value,
    }))
    .sort((a, b) => b.value - a.value)
}
