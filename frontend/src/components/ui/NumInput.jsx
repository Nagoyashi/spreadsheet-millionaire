// Shared number input used across all calculators.
// Props:
//   label   — field label (string)
//   prefix  — left adornment, e.g. "$" (string, optional)
//   suffix  — right adornment, e.g. "%" (string, optional)
//   value   — controlled value
//   onChange — (value: string) => void
//   hint    — muted label suffix, e.g. "per year" (string, optional)
//   min, max — enforced on change/blur (step is accepted but unused since the
//              v0.15.2 switch to a text input: no native spinner to step)
//
// The input is type="text" + inputMode="decimal" (since v0.15.2) so comma
// decimals ("1,5") reach handleChange and are normalised to dots — a
// type="number" input swallows the comma keystroke entirely. All bounds are
// enforced in JS, split by bound:
//   max — clamped on CHANGE. Typing appends digits, so a prefix of an in-range
//         number never overshoots it; snapping immediately is safe.
//   min — clamped on BLUR. Prefixes of in-range numbers ARE below a raised min
//         ("3" on the way to "35" with min 18), so clamping per keystroke made
//         typing impossible — the field snapped to 18, then "185" → max. Let
//         under-min values sit while the field is focused; snap when it commits.
// Non-numeric input is ignored, and an empty field stays empty (every
// calculator treats "" as 0 via `parseFloat(x) || 0`). The committed (blurred)
// value can therefore never be outside [min, max].

import { useId } from 'react'

// Optional color accents (v0.15.1) — a tone tints the focus ring, the prefix
// adornment, and a filled field's border, so e.g. income/expense grids read at
// a glance. Default stays the neutral blue used across the calculators.
const TONES = {
  default: {
    ring: 'focus-within:ring-blue-500',
    prefix: 'bg-gray-50 text-gray-500 border-gray-300',
    filled: 'border-gray-300 bg-white',
  },
  emerald: {
    ring: 'focus-within:ring-emerald-500',
    prefix: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    filled: 'border-emerald-300 bg-emerald-50/40',
  },
  rose: {
    ring: 'focus-within:ring-rose-500',
    prefix: 'bg-rose-50 text-rose-600 border-rose-200',
    filled: 'border-rose-300 bg-rose-50/40',
  },
}

// Call sites may still pass `step`; it's ignored — the text input has no
// native spinner to step (destructuring simply doesn't pick it up).
export default function NumInput({
  label,
  prefix,
  suffix,
  value,
  onChange,
  hint,
  min,
  max,
  tone = 'default',
}) {
  const id = useId()
  const t = TONES[tone] ?? TONES.default
  const hasValue = value !== '' && value != null
  function handleChange(raw) {
    // Comma decimals (v0.15.2): "1,5" is normalised to "1.5" — the input is
    // type="text" + inputMode="decimal" (a type="number" input never even
    // delivers a comma keystroke), and every consumer parses with Number().
    raw = raw.replace(',', '.')
    // Empty field → defined fallback (calculators read "" as 0).
    if (raw === '') {
      onChange('')
      return
    }
    // A trailing separator ("12.") is a number mid-entry — Number() accepts it.
    const num = Number(raw)
    // Ignore keystrokes that don't parse to a finite number (e.g. a lone "-",
    // "e", or a second separator); keep the previous value rather than garbage.
    if (!Number.isFinite(num)) return
    if (max != null && num > max) {
      onChange(String(max))
      return
    }
    // A negative entry can never become in-range by appending digits when the
    // range is non-negative — snap it immediately (keeps the old behavior on
    // the min={0} monetary fields).
    if (min != null && min >= 0 && num < 0) {
      onChange(String(min))
      return
    }
    // In range (or transiently under min while typing): keep the raw string so
    // in-progress entry like "0." or "1.0" survives until the next keystroke.
    onChange(raw)
  }

  function handleBlur() {
    if (value === '' || value == null) return
    const num = Number(value)
    if (min != null && Number.isFinite(num) && num < min) onChange(String(min))
  }

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-600 mb-1">
        {label}
        {hint && <span className="ml-1 text-gray-400 font-normal">{hint}</span>}
      </label>
      <div
        className={`flex rounded-lg border focus-within:ring-2 overflow-hidden ${t.ring} ${hasValue ? t.filled : 'border-gray-300 bg-white'}`}
      >
        {prefix && (
          <span className={`px-3 py-2 text-sm border-r flex items-center ${t.prefix}`}>
            {prefix}
          </span>
        )}
        {/* type="text" (not "number") so comma decimals reach handleChange;
            inputMode keeps the numeric keyboard on mobile. Bounds are enforced
            in JS above — native min/max only ever constrained the spinner. */}
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          className="flex-1 min-w-0 px-3 py-2.5 sm:py-2 text-base sm:text-sm text-gray-800 bg-transparent focus:outline-none"
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
