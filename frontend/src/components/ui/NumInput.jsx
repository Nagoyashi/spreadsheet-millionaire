// Shared number input used across all calculators.
// Props:
//   label   — field label (string)
//   prefix  — left adornment, e.g. "$" (string, optional)
//   suffix  — right adornment, e.g. "%" (string, optional)
//   value   — controlled value
//   onChange — (value: string) => void
//   hint    — muted label suffix, e.g. "per year" (string, optional)
//   min, max, step — passed to <input type="number"> AND enforced on change
//
// Clamping (the actual robustness guard): native min/max only constrain the
// spinner — they do NOT stop typed or pasted values like "8e31" or "-5", which
// is the real failure mode. So we clamp in handleChange too: out-of-range values
// snap to the bound, non-numeric input is ignored, and an empty field stays empty
// (every calculator treats "" as 0 via `parseFloat(x) || 0`). The visible field
// can therefore never hold a value outside [min, max].

export default function NumInput({ label, prefix, suffix, value, onChange, hint, min, max, step = 'any' }) {
  function handleChange(raw) {
    // Empty field → defined fallback (calculators read "" as 0).
    if (raw === '') { onChange(''); return }
    const num = Number(raw)
    // Ignore keystrokes that don't parse to a finite number (e.g. a lone "-"
    // or "e"); keep the previous value rather than writing garbage.
    if (!Number.isFinite(num)) return
    if (max != null && num > max) { onChange(String(max)); return }
    if (min != null && num < min) { onChange(String(min)); return }
    // In range: keep the raw string so in-progress entry like "0." or "1.0"
    // survives until the next keystroke.
    onChange(raw)
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">
        {label}
        {hint && <span className="ml-1 text-gray-400 font-normal">{hint}</span>}
      </label>
      <div className="flex rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden">
        {prefix && (
          <span className="px-3 py-2 bg-gray-50 text-gray-500 text-sm border-r border-gray-300 flex items-center">
            {prefix}
          </span>
        )}
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={e => handleChange(e.target.value)}
          min={min}
          max={max}
          step={step}
          className="flex-1 min-w-0 px-3 py-2.5 sm:py-2 text-base sm:text-sm text-gray-800 bg-white focus:outline-none"
        />
        {suffix && (
          <span className="px-3 py-2 bg-gray-50 text-gray-500 text-sm border-l border-gray-300 flex items-center">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}
