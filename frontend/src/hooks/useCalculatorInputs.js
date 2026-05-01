import { useState, useEffect, useCallback, useRef } from 'react'
import { migrate, stripVersion } from '../utils/migrateCalcData'

// Encapsulates the input-state plumbing every calculator used to duplicate.
//
// Replaces this boilerplate (which was copy-pasted across all 12 calculators):
//   const [inputs, setInputs] = useState({ ...DEFAULTS, ...initialData })
//   useEffect(() => { if (initialData) setInputs({ ...DEFAULTS, ...initialData }) }, [initialData])
//   useEffect(() => { onDataChange?.(inputs) }, [inputs, onDataChange])
//   const set = key => val => setInputs(prev => ({ ...prev, [key]: val }))
//
// Usage in a calculator:
//   const { inputs, set } = useCalculatorInputs({
//     defaults: DEFAULTS,
//     initialData,
//     onDataChange,
//     calcType: 'fire',
//   })
//
// Behaviour notes:
//   - DEFAULTS is the single source of truth for shape + version.
//   - initialData (from a loaded saved record) is migrated forward via
//     migrate() before being merged on top of DEFAULTS.
//   - onDataChange fires with version-stripped data, so CalculatorPage's
//     currentDataRef stays clean for save calls.
//   - The latest onDataChange callback is captured via a ref so callers
//     don't need to memoize it.

export function useCalculatorInputs({ defaults, initialData, onDataChange, calcType }) {
  const currentVersion = Number(defaults.version) || 1

  const buildInitial = (override) => {
    if (!override) return { ...defaults }
    const migrated = migrate(calcType, override, currentVersion)
    return { ...defaults, ...migrated }
  }

  const [inputs, setInputs] = useState(() => buildInitial(initialData))

  // Keep a ref of the latest onDataChange so we don't re-run the notify
  // effect just because the parent re-rendered with a new function identity.
  const onDataChangeRef = useRef(onDataChange)
  useEffect(() => { onDataChangeRef.current = onDataChange }, [onDataChange])

  // When a saved record is loaded (initialData changes to a new object),
  // re-seed state with migrated values on top of DEFAULTS.
  useEffect(() => {
    if (initialData) setInputs(buildInitial(initialData))
    // buildInitial is intentionally not in deps — it's a stable closure over
    // `defaults` and `calcType`, both of which are constants per calculator.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData])

  // Notify parent of the latest inputs (with internal version key stripped
  // so currentDataRef holds clean user data ready to save).
  useEffect(() => {
    onDataChangeRef.current?.(stripVersion(inputs))
  }, [inputs])

  const set = useCallback(
    (key) => (val) => setInputs(prev => ({ ...prev, [key]: val })),
    []
  )

  return { inputs, set, setInputs }
}
