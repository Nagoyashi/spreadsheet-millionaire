// Migrates saved calculator data forward across schema versions.
//
// Why this exists:
//   Saved data is stored as opaque JSON in SQLite. If we rename a field,
//   add a required field, or change units, every previously-saved record
//   silently breaks on load. This module gives us a controlled upgrade path.
//
// How it works:
//   - Every calculator declares CURRENT_VERSION via DEFAULTS.version (number).
//   - When a saved record loads, useCalculatorInputs calls migrate() to
//     bring its data up to CURRENT_VERSION.
//   - When the user saves, useSave strips the version field (it's metadata,
//     not user input) — the backend stores only the inputs.
//   - On load, useCalculatorInputs re-injects the stored version (or 1 if
//     missing for legacy records) and runs any registered migrations.
//
// Adding a migration (example: FIRE renames savings_rate -> savings_pct in v2):
//   MIGRATIONS.fire = {
//     2: (data) => ({ ...data, savings_pct: data.savings_rate, savings_rate: undefined }),
//   }
//   Then bump FIRECalculator's DEFAULTS.version to 2.

// Per-type migration registry: { [calcType]: { [targetVersion]: (data) => data } }
const MIGRATIONS = {
  // Sankey v1 -> v2: flat expense_categories[] becomes nested expense_groups[].
  // Existing flat expenses are wrapped into a single "Expenses" group so old
  // saved records load without data loss. The user can reorganise into more
  // groups afterwards. Non-destructive: every category survives as a subitem.
  sankey: {
    2: (data) => {
      // Already migrated or constructed in v2 shape — leave as-is.
      if (Array.isArray(data.expense_groups)) {
        const { expense_categories, ...rest } = data
        return rest
      }
      const flat = Array.isArray(data.expense_categories) ? data.expense_categories : []
      const { expense_categories, ...rest } = data
      return {
        ...rest,
        expense_groups: [
          {
            id: 'group_expenses',
            label: 'Expenses',
            items: flat.map(c => ({
              id: c.id,
              label: c.label,
              value: c.value,
            })),
          },
        ],
      }
    },
  },
}

const VERSION_KEY = '__v'   // internal key used to track version on loaded data

/**
 * Run all migrations needed to bring `data` from its stored version up to
 * `currentVersion`. Pure function — does not mutate input.
 *
 * @param {string} calcType   — e.g. 'fire', 'sankey'
 * @param {object} data       — raw saved data (may or may not include __v)
 * @param {number} currentVersion — target version (from calculator DEFAULTS)
 * @returns {object}          — migrated data, with __v set to currentVersion
 */
export function migrate(calcType, data, currentVersion) {
  if (!data || typeof data !== 'object') return data

  const fromVersion = Number(data[VERSION_KEY]) || 1
  if (fromVersion === currentVersion) return { ...data, [VERSION_KEY]: currentVersion }

  if (fromVersion > currentVersion) {
    // Saved data is from a newer schema than this client knows about.
    // Don't downgrade — just hand it back as-is and let the calculator's
    // DEFAULTS-spread fill in any missing fields.
    console.warn(`[migrate] ${calcType}: saved v${fromVersion} > client v${currentVersion} — skipping`)
    return { ...data, [VERSION_KEY]: currentVersion }
  }

  const steps = MIGRATIONS[calcType] || {}
  let migrated = { ...data }
  for (let v = fromVersion + 1; v <= currentVersion; v++) {
    const step = steps[v]
    if (typeof step === 'function') {
      migrated = step(migrated)
    }
    // Missing migration step is fine — means no field changes were needed
    // between those versions, just a version bump for tracking.
  }
  migrated[VERSION_KEY] = currentVersion
  return migrated
}

/**
 * Strip the version field before sending data to the backend.
 * The version is a client-side concern; the backend just stores opaque JSON.
 */
export function stripVersion(data) {
  if (!data || typeof data !== 'object') return data
  const { [VERSION_KEY]: _v, ...rest } = data
  return rest
}

/**
 * Inject a version into data being loaded from the backend.
 * Defaults to 1 for legacy records that pre-date versioning.
 */
export function injectVersion(data, version = 1) {
  if (!data || typeof data !== 'object') return data
  if (data[VERSION_KEY] != null) return data
  return { ...data, [VERSION_KEY]: version }
}

export { VERSION_KEY }
