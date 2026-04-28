// Shared number input used across all calculators.
// Props:
//   label   — field label (string)
//   prefix  — left adornment, e.g. "$" (string, optional)
//   suffix  — right adornment, e.g. "%" (string, optional)
//   value   — controlled value
//   onChange — (value: string) => void
//   hint    — muted label suffix, e.g. "per year" (string, optional)
//   min, max, step — passed to <input type="number">

export default function NumInput({ label, prefix, suffix, value, onChange, hint, min, max, step = 'any' }) {
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
          value={value}
          onChange={e => onChange(e.target.value)}
          min={min}
          max={max}
          step={step}
          className="flex-1 px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none"
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
