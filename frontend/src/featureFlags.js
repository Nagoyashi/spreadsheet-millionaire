// Feature flags — single source of truth for build-time gating.
//
// NET_WORTH_ENABLED controls whether the Net Worth tracker is revealed. The
// tracker ships "dark": fully built and deployable, but hidden in production
// (which keeps showing the "Coming soon" teaser) until a later waiting-list
// launch. See DECISIONS.md § "Net Worth Tracker" → Launch gating.
//
// Resolution:
//   - If VITE_NETWORTH_ENABLED is set, it wins ("true" => on).
//   - Otherwise default to import.meta.env.DEV — on under `vite dev`, off in
//     production builds. Staging (a prod build) opts in with VITE_NETWORTH_ENABLED=true.

const truthy = (v) => String(v).toLowerCase() === 'true'

export const NET_WORTH_ENABLED =
  import.meta.env.VITE_NETWORTH_ENABLED !== undefined
    ? truthy(import.meta.env.VITE_NETWORTH_ENABLED)
    : import.meta.env.DEV
