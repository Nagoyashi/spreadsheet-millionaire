import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, Search, Shield } from 'lucide-react'
import { adminApi } from '../../api/adminApi'

// User Management (Screen 3) — searchable, tier-filterable accounts table with
// inline tier control (Free/Pro/Elite) and suspend/reinstate. Tier/suspend write
// through adminApi.updateUser (audit-logged server-side); the UI updates
// optimistically. Activity + LTV are beta placeholders (GA4 #152 / billing).

const TIERS = ['free', 'pro', 'elite']

const TIER_PILL = {
  free: { label: 'Free', color: '#8b9199', bg: '#eef0f2' },
  pro: { label: 'Pro', color: '#b8860b', bg: '#fdf3da' },
  elite: { label: 'Elite', color: '#15181c', bg: 'rgba(21,24,28,.10)' },
}

const AVATAR_TINTS = [
  { color: '#2563eb', bg: '#e8effd' },
  { color: '#16a34a', bg: '#e7f6ec' },
  { color: '#b8860b', bg: '#fdf3da' },
  { color: '#ef4444', bg: '#fdeaea' },
]

function initials(email) {
  return (email || '?').split('@')[0].slice(0, 2).toUpperCase()
}
function tintFor(id) {
  return AVATAR_TINTS[id % AVATAR_TINTS.length]
}
function fmtDate(iso) {
  return iso ? new Date(iso).toISOString().slice(0, 10) : '—'
}
function relative(iso) {
  if (!iso) return 'never'
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function Badge({ label, color, bg }) {
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide"
      style={{ color, background: bg }}
    >
      {label}
    </span>
  )
}

function TierMenu({ user, isSuperadmin, canDelete, onPick, onSetAdmin, onDelete, onClose }) {
  // Two-step confirm for the destructive action — the first click arms it, the
  // second executes. Closing the menu (backdrop) resets naturally on remount.
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  return (
    <>
      {/* backdrop closes on outside click */}
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div
        className="absolute right-0 top-full mt-1 z-30 w-[190px] bg-white rounded-xl border border-[#e8ebee] py-1"
        style={{ boxShadow: '0 10px 28px rgba(15,20,30,.18)' }}
      >
        {TIERS.map((t) => (
          <button
            key={t}
            onClick={() => onPick({ tier: t })}
            className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[#fafbfc]"
          >
            {TIER_PILL[t].label}
            {user.tier === t && <Check className="w-4 h-4 text-[#16a34a]" />}
          </button>
        ))}
        {/* Support tools (#182): export is a plain GET-attachment link (same
            pattern as the self-service export — not a fetch, so rule 4 doesn't
            apply); it is audit-logged server-side. */}
        <div className="my-1 border-t border-[#f1f3f5]" />
        <a
          href={`/api/admin/users/${user.id}/export`}
          download
          onClick={onClose}
          className="block w-full text-left px-3 py-2 text-sm text-[#15181c] hover:bg-[#fafbfc] no-underline"
        >
          Export data (JSON)
        </a>
        <button
          onClick={() => onPick({ suspended: !user.suspended })}
          className="w-full text-left px-3 py-2 text-sm text-[#ef4444] hover:bg-[#fdeaea]"
        >
          {user.suspended ? 'Reinstate account' : 'Suspend account'}
        </button>
        {canDelete && (
          <button
            onClick={() => (confirmingDelete ? onDelete() : setConfirmingDelete(true))}
            className={`w-full text-left px-3 py-2 text-sm font-semibold ${
              confirmingDelete
                ? 'text-white bg-[#ef4444] hover:bg-[#dc2626]'
                : 'text-[#ef4444] hover:bg-[#fdeaea]'
            }`}
          >
            {confirmingDelete ? 'Confirm permanent delete' : 'Delete account…'}
          </button>
        )}
        {/* Granting/revoking admin is superadmin-only and not allowed on a
            superadmin (always an admin). */}
        {isSuperadmin && !user.is_superadmin && (
          <>
            <div className="my-1 border-t border-[#f1f3f5]" />
            <button
              onClick={() => onSetAdmin(!user.is_admin)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#b8860b] hover:bg-[#fdf3da]"
            >
              <Shield className="w-3.5 h-3.5" />
              {user.is_admin ? 'Revoke admin' : 'Make admin'}
            </button>
          </>
        )}
      </div>
    </>
  )
}

function UserRow({ user, menuOpen, onMenu, onPick, onSetAdmin, onDelete, isSuperadmin, selfId }) {
  // Mirrors the server's delete guards so the menu doesn't offer what the API
  // rejects: not yourself, never a superadmin, admins only for a superadmin.
  const canDelete = user.id !== selfId && !user.is_superadmin && (!user.is_admin || isSuperadmin)
  const tint = tintFor(user.id)
  const pill = TIER_PILL[user.tier] || TIER_PILL.free
  return (
    <div
      className="grid items-center gap-3 px-[22px] py-[14px] border-t border-[#f1f3f5] hover:bg-[#fafbfc]"
      style={{
        gridTemplateColumns: '2.4fr 1fr 1fr 1.2fr 0.8fr 1fr 0.9fr',
        opacity: user.suspended ? 0.55 : 1,
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="w-9 h-9 shrink-0 rounded-full grid place-items-center text-[12px] font-bold"
          style={{ color: tint.color, background: tint.bg }}
        >
          {initials(user.email)}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="text-[13px] font-bold text-[#15181c] truncate">
              {user.email.split('@')[0]}
            </span>
            {user.is_superadmin ? (
              <Badge label="SUPERADMIN" color="#7c3aed" bg="#f1eafe" />
            ) : (
              user.is_admin && <Badge label="ADMIN" color="#b8860b" bg="#fdf3da" />
            )}
            {user.suspended && <Badge label="SUSPENDED" color="#ef4444" bg="#fdeaea" />}
          </span>
          <span className="block text-[12px] font-medium text-[#9aa0a8] truncate">{user.email}</span>
        </span>
      </div>

      <div className="font-mono text-[13px] text-[#6b7280]">{fmtDate(user.created_at)}</div>
      <div className="font-mono text-[13px] text-[#6b7280]">{relative(user.last_login_at)}</div>
      <div className="text-[13px] text-[#9aa0a8]">{user.activity || '—'}</div>
      <div className="text-right font-mono text-[13px] text-[#6b7280] pr-2">
        ${Number(user.ltv || 0).toFixed(2)}
      </div>

      <div className="relative">
        <button
          onClick={() => onMenu(menuOpen ? null : user.id)}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold"
          style={{ color: pill.color, background: pill.bg }}
        >
          {pill.label}
          <ChevronDown className="w-3 h-3" />
        </button>
        {menuOpen && (
          <TierMenu
            user={user}
            isSuperadmin={isSuperadmin}
            canDelete={canDelete}
            onPick={(f) => onPick(user, f)}
            onSetAdmin={(next) => onSetAdmin(user, next)}
            onDelete={() => onDelete(user)}
            onClose={() => onMenu(null)}
          />
        )}
      </div>

      <div className="text-[13px]">
        {user.suspended ? (
          <button
            onClick={() => onPick(user, { suspended: false })}
            className="text-[#16a34a] font-semibold hover:underline"
          >
            Reinstate
          </button>
        ) : (
          <span className="text-[#9aa0a8]">View</span>
        )}
      </div>
    </div>
  )
}

export default function AdminUsers({ auth }) {
  const isSuperadmin = !!auth?.user?.is_superadmin
  const [users, setUsers] = useState(null)
  const [counts, setCounts] = useState({})
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState('') // '' = All
  const [menuOpen, setMenuOpen] = useState(null)
  const [error, setError] = useState(null)

  // Fetch on mount + whenever filters change (search debounced).
  useEffect(() => {
    let alive = true
    const run = () =>
      adminApi.getUsers({ search, tier: tierFilter }).then(({ ok, data }) => {
        if (!alive) return
        if (ok) {
          setUsers(data.users)
          setCounts(data.tier_counts || {})
        } else {
          setError('Could not load users.')
        }
      })
    const t = setTimeout(run, search ? 250 : 0)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [search, tierFilter])

  // Shared optimistic update: patch the row immediately, reconcile with the
  // server's echo, roll back on failure. `after` runs only on success.
  function applyOptimistic(user, patch, call, after) {
    setMenuOpen(null)
    const prev = users
    setUsers((us) => us.map((u) => (u.id === user.id ? { ...u, ...patch } : u)))
    call().then(({ ok, data }) => {
      if (!ok) {
        setUsers(prev) // rollback
        return
      }
      setUsers((us) => us.map((u) => (u.id === user.id ? data.user : u)))
      after?.()
    })
  }

  function update(user, fields) {
    // Tier-count chips refetch on the next filter change; adjust locally for
    // immediate feedback when the tier actually changed.
    applyOptimistic(user, fields, () => adminApi.updateUser(user.id, fields), () => {
      if ('tier' in fields && fields.tier !== user.tier) {
        setCounts((c) => ({
          ...c,
          [user.tier]: Math.max(0, (c[user.tier] || 0) - 1),
          [fields.tier]: (c[fields.tier] || 0) + 1,
        }))
      }
    })
  }

  // Superadmin-only: grant/revoke the admin role via the dedicated endpoint.
  function setAdmin(user, nextIsAdmin) {
    applyOptimistic(user, { is_admin: nextIsAdmin }, () => adminApi.setUserAdmin(user.id, nextIsAdmin))
  }

  // Support-path hard delete (#182). NOT optimistic — a destructive action
  // waits for the server before the row disappears; failure shows the error.
  function remove(user) {
    setMenuOpen(null)
    adminApi.deleteUser(user.id).then(({ ok, data }) => {
      if (!ok) {
        setError(data?.error || 'Could not delete the account.')
        return
      }
      setUsers((us) => us.filter((u) => u.id !== user.id))
      setCounts((c) => ({ ...c, [user.tier]: Math.max(0, (c[user.tier] || 0) - 1) }))
    })
  }

  const total = useMemo(() => Object.values(counts).reduce((a, b) => a + b, 0), [counts])

  const chips = [
    { key: '', label: 'All', count: total },
    ...TIERS.map((t) => ({ key: t, label: TIER_PILL[t].label, count: counts[t] || 0 })),
  ]

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-[-0.5px]">User Management</h1>
          <p className="text-sm font-medium text-[#6b7280] mt-1">
            {total.toLocaleString()} accounts · everyone on Free during beta
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9aa0a8]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or name…"
            className="w-full bg-white border border-[#e2e5e9] rounded-[10px] pl-9 pr-3 py-2.5 text-sm outline-none focus:border-[#f5b829]"
          />
        </div>
        <div className="flex items-center gap-2">
          {chips.map((c) => {
            const active = tierFilter === c.key
            return (
              <button
                key={c.key || 'all'}
                onClick={() => setTierFilter(c.key)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold border transition ${
                  active
                    ? 'bg-[#15181c] text-white border-[#15181c]'
                    : 'bg-white text-[#6b7280] border-[#e2e5e9] hover:border-[#cbd0d6]'
                }`}
              >
                {c.label}
                <span className={`font-mono text-[11px] ${active ? 'text-white/70' : 'text-[#9aa0a8]'}`}>
                  {c.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[14px] border border-[#e8ebee] overflow-visible">
        <div
          className="grid gap-3 px-[22px] py-[13px] text-[11px] font-bold uppercase tracking-[0.5px] text-[#8b9199]"
          style={{ gridTemplateColumns: '2.4fr 1fr 1fr 1.2fr 0.8fr 1fr 0.9fr' }}
        >
          <div>User</div>
          <div>Signed up</div>
          <div>Last login</div>
          <div>Activity</div>
          <div className="text-right pr-2">LTV</div>
          <div>Tier</div>
          <div>Actions</div>
        </div>

        {error && <div className="px-[22px] py-6 text-sm text-[#ef4444]">{error}</div>}

        {!users && !error &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-[22px] py-3 border-t border-[#f1f3f5]">
              <div className="h-9 rounded-lg bg-[#f1f3f5] animate-pulse" />
            </div>
          ))}

        {users && users.length === 0 && (
          <div className="px-[22px] py-8 text-center text-sm text-[#9aa0a8] border-t border-[#f1f3f5]">
            No accounts match.
          </div>
        )}

        {users &&
          users.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              menuOpen={menuOpen === u.id}
              onMenu={setMenuOpen}
              onPick={update}
              onSetAdmin={setAdmin}
              onDelete={remove}
              isSuperadmin={isSuperadmin}
              selfId={auth?.user?.id}
            />
          ))}
      </div>
    </div>
  )
}
