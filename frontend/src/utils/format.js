// Shared number formatter used across all calculators.
//
// Replaces the ~12 local fmt() functions that were nearly identical.
//
// Defaults match the original behaviour (USD, M/K compact suffixes) so
// no existing UI changes when calculators swap their local fmt() for this.
//
// Examples:
//   fmt(1500000)              -> "$1.50M"
//   fmt(2500)                 -> "$2.5K"
//   fmt(42)                   -> "$42"
//   fmt(1500, { currency: '€' }) -> "€1.5K"
//   fmt(1500, { currency: '' })  -> "1.5K"      // currency-agnostic
//   fmt(2500, { compact: false }) -> "$2,500"   // full digits with grouping

const DEFAULT_OPTS = {
  currency: '$',
  compact: true,        // M/K suffixes for >= 1_000
  millionDecimals: 2,
  thousandDecimals: 1,
}

// Display ceiling. Bounded inputs keep normal results well under this, but a
// valid-yet-extreme combination (e.g. 50%/yr compounded for 100 years) can still
// produce a legitimately huge finite number. Rather than emit a 20-digit
// "$…M" overflow string, anything at or above this renders as a capped marker.
const DISPLAY_CEILING = 1e15

export function fmt(n, opts = {}) {
  const { currency, compact, millionDecimals, thousandDecimals } = { ...DEFAULT_OPTS, ...opts }
  const num = Number(n)
  if (!Number.isFinite(num)) return `${currency}0`

  const sign = num < 0 ? '-' : ''
  const abs  = Math.abs(num)

  // Display safety net for extreme-but-valid magnitudes.
  if (abs >= DISPLAY_CEILING) return `${sign}${currency}999T+`

  if (compact) {
    if (abs >= 1_000_000_000_000) return `${sign}${currency}${(abs / 1_000_000_000_000).toFixed(millionDecimals)}T`
    if (abs >= 1_000_000_000)     return `${sign}${currency}${(abs / 1_000_000_000).toFixed(millionDecimals)}B`
    if (abs >= 1_000_000)         return `${sign}${currency}${(abs / 1_000_000).toFixed(millionDecimals)}M`
    if (abs >= 1_000)             return `${sign}${currency}${(abs / 1_000).toFixed(thousandDecimals)}K`
    return `${sign}${currency}${Math.round(abs)}`
  }

  return `${sign}${currency}${Math.round(abs).toLocaleString('en-US')}`
}

// Derived-metric guard. Computed ratios/percentages (Money Multiplier, Interest %,
// Coverage %, ROI) can divide by zero or overflow before they reach the UI, where
// fmt() never sees them. Route them through this so a non-finite result renders the
// fallback instead of "Infinity"/"NaN". One helper, reused — no scattered isFinite.
export function finiteOr(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback
}

// Convenience: percentage formatter — used in a couple of calculators.
// fmtPct(0.0735) -> "7.4%"   |   fmtPct(7.35, { fromPercent: true }) -> "7.4%"
export function fmtPct(n, { decimals = 1, fromPercent = false } = {}) {
  const num = Number(n)
  if (!Number.isFinite(num)) return '0%'
  const value = fromPercent ? num : num * 100
  return `${value.toFixed(decimals)}%`
}
