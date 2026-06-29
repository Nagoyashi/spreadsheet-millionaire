import { useEffect, useState } from 'react'
import { Wallet, ArrowRightLeft } from 'lucide-react'
import { adminApi } from '../../api/adminApi'
import { CALC_MAP, DEFAULT_PUBLISHED_TYPES } from '../../calculators/registry'
import { invalidatePublished } from '../../calculators/usePublished'

// Tracker rows aren't calculators (no registry entry) — their display metadata
// lives here, keyed by the publish slug. They appear in Overview alongside
// calculators and toggle through the same mechanism (publishing reveals them on
// the public app out of "coming soon").
const TRACKER_META = {
  'net-worth': { label: 'Net Worth Tracker', subtitle: 'Track assets & liabilities', category: 'Tracker', Icon: Wallet },
  'income-expenses': { label: 'Income & Expense Tracker', subtitle: 'Cashflow in and out', category: 'Tracker', Icon: ArrowRightLeft },
}
const metaFor = (calcType) => CALC_MAP[calcType] || TRACKER_META[calcType]
const isTracker = (calcType) => calcType in TRACKER_META

// Overview (Project Status) — the calculator catalog with live publish toggles.
// Merges the backend's runtime publish rows (adminApi.getCalculators) with the
// registry's metadata by calc_type. Toggling flips the DB flag the public /app
// reads, so it publishes/unpublishes live (optimistic UI, rollback on failure).

const DEFAULT_SET = new Set(DEFAULT_PUBLISHED_TYPES)

// Category pill palette (DESIGN_SPECS § Overview). Unknown categories fall back
// to neutral so a new category never crashes the table.
const CATEGORY_STYLE = {
  Retirement: { color: '#16a34a', bg: '#e7f6ec' },
  Investing: { color: '#2563eb', bg: '#e8effd' },
  'Debt & Property': { color: '#ef4444', bg: '#fdeaea' },
  Budgeting: { color: '#16a34a', bg: '#e7f6ec' },
  Tracker: { color: '#7c3aed', bg: '#f1eafe' },
}
const NEUTRAL = { color: '#8b9199', bg: '#eef0f2' }

// Status is derived from the runtime published flag (never stored):
//   Live        — published now
//   Coming soon — an unpublished tracker (ships dark until revealed)
//   Hidden      — an unpublished calculator that was in the default live set
//   Draft       — an unpublished calculator that never was (backlog)
function statusOf(row) {
  if (row.published) return { label: 'Live', color: '#16a34a', bg: '#e7f6ec' }
  if (isTracker(row.calc_type)) return { label: 'Coming soon', color: '#e0a712', bg: '#fdf3da' }
  if (DEFAULT_SET.has(row.calc_type)) return { label: 'Hidden', ...NEUTRAL }
  return { label: 'Draft', ...NEUTRAL }
}

function Toggle({ on, onClick, disabled }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      className="relative inline-block w-10 h-[23px] rounded-full transition-colors disabled:opacity-50"
      style={{ background: on ? '#f5b829' : '#d6dade' }}
    >
      <span
        className="absolute top-[2px] w-[19px] h-[19px] rounded-full bg-white shadow-sm transition-[left] duration-150"
        style={{ left: on ? '19px' : '2px' }}
      />
    </button>
  )
}

function Pill({ label, color, bg }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ color, background: bg }}
    >
      {label}
    </span>
  )
}

function StatCard({ label, value, valueColor }) {
  return (
    <div className="bg-white rounded-xl border border-[#e8ebee] p-[16px_18px] px-[18px] py-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.5px] text-[#8b9199]">{label}</div>
      <div
        className="mt-1 text-[26px] font-bold font-mono leading-none"
        style={{ color: valueColor || '#15181c' }}
      >
        {value}
      </div>
    </div>
  )
}

function Row({ row, onToggle }) {
  const meta = metaFor(row.calc_type) || {}
  const Icon = meta.Icon
  const cat = CATEGORY_STYLE[meta.category] || NEUTRAL
  const status = statusOf(row)
  const glyph = row.published ? cat : NEUTRAL

  return (
    <div
      className="grid items-center gap-3 px-[22px] py-[14px] border-t border-[#f1f3f5] hover:bg-[#fafbfc]"
      style={{ gridTemplateColumns: '2.6fr 1.2fr 1.1fr 0.9fr 0.8fr' }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="w-[38px] h-[38px] shrink-0 grid place-items-center rounded-[10px]"
          style={{ background: glyph.bg }}
        >
          {Icon && <Icon className="w-[18px] h-[18px]" style={{ color: glyph.color }} />}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-bold text-[#15181c] truncate">
            {meta.label || row.calc_type}
          </span>
          <span className="block text-[12px] font-medium text-[#9aa0a8] truncate">
            {meta.subtitle || ''}
          </span>
        </span>
      </div>

      <div>{meta.category && <Pill label={meta.category} color={cat.color} bg={cat.bg} />}</div>
      <div><Pill {...status} /></div>
      <div className="text-right font-mono text-sm text-[#9aa0a8] pr-2">
        {row.visits_30d == null ? '—' : row.visits_30d.toLocaleString()}
      </div>
      <div className="flex justify-start">
        <Toggle on={row.published} disabled={row.pending} onClick={() => onToggle(row)} />
      </div>
    </div>
  )
}

export default function AdminOverview() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    adminApi.getCalculators().then(({ ok, data }) => {
      if (!alive) return
      if (ok && Array.isArray(data?.calculators)) {
        // Only show types we have metadata for (calculators via the registry,
        // trackers via TRACKER_META); backend order keeps the table stable.
        setRows(data.calculators.filter((r) => metaFor(r.calc_type)))
      } else {
        setError('Could not load calculators.')
      }
    })
    return () => {
      alive = false
    }
  }, [])

  function toggle(row) {
    const next = !row.published
    // Optimistic: flip + mark pending so the switch is disabled mid-flight.
    setRows((rs) =>
      rs.map((r) => (r.calc_type === row.calc_type ? { ...r, published: next, pending: true } : r)),
    )
    adminApi.setPublished(row.calc_type, next).then(({ ok }) => {
      setRows((rs) =>
        rs.map((r) =>
          r.calc_type === row.calc_type
            ? { ...r, published: ok ? next : row.published, pending: false }
            : r,
        ),
      )
      if (ok) invalidatePublished() // public /app reflects the change
    })
  }

  const live = rows ? rows.filter((r) => r.published) : []
  const backlog = rows ? rows.filter((r) => !r.published) : []

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-[-0.5px]">Project Status</h1>
          <p className="text-sm font-medium text-[#6b7280] mt-1">
            Every calculator and its visibility on the public app. Toggle to publish or hide live.
          </p>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px] mb-5">
        <StatCard label="Live" value={rows ? live.length : '—'} valueColor="#16a34a" />
        <StatCard label="Hidden / backlog" value={rows ? backlog.length : '—'} valueColor="#e0a712" />
        <StatCard label="Visits · 30d" value="—" />
        <StatCard label="Calc runs · 30d" value="—" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-[14px] border border-[#e8ebee] overflow-hidden">
        <div
          className="grid gap-3 px-[22px] py-[13px] text-[11px] font-bold uppercase tracking-[0.5px] text-[#8b9199]"
          style={{ gridTemplateColumns: '2.6fr 1.2fr 1.1fr 0.9fr 0.8fr' }}
        >
          <div>Calculator</div>
          <div>Category</div>
          <div>Status</div>
          <div className="text-right pr-2">Visits · 30d</div>
          <div>Public</div>
        </div>

        {error && <div className="px-[22px] py-6 text-sm text-[#ef4444]">{error}</div>}

        {!rows && !error && (
          <div className="px-[22px] py-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-9 rounded-lg bg-[#f1f3f5] animate-pulse" />
            ))}
          </div>
        )}

        {rows && (
          <>
            {live.map((r) => (
              <Row key={r.calc_type} row={r} onToggle={toggle} />
            ))}
            {backlog.length > 0 && (
              <div className="px-[22px] py-2 bg-[#fafbfc] border-t border-[#f1f3f5] text-[11px] font-bold uppercase tracking-[0.5px] text-[#9aa0a8]">
                Backlog · not yet published
              </div>
            )}
            {backlog.map((r) => (
              <Row key={r.calc_type} row={r} onToggle={toggle} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
