// Feature flags — single source of truth for build-time gating.
//
// Each tracker ships "dark": fully built and deployable, but hidden in production
// (which keeps showing the "Coming soon" teaser) until a later waiting-list
// launch. See DECISIONS.md §§ "Net Worth Tracker" / "Income & Expense Tracker".
//
// Resolution (per flag):
//   - If the VITE_* env var is set, it wins ("true" => on).
//   - Otherwise default to import.meta.env.DEV — on under `vite dev`, off in
//     production builds. Staging (a prod build) opts in via the env var.

const truthy = (v) => String(v).toLowerCase() === 'true'

const flag = (envValue) => (envValue !== undefined ? truthy(envValue) : import.meta.env.DEV)

export const NET_WORTH_ENABLED = flag(import.meta.env.VITE_NETWORTH_ENABLED)
export const INCOME_EXPENSE_ENABLED = flag(import.meta.env.VITE_INCOME_EXPENSE_ENABLED)
