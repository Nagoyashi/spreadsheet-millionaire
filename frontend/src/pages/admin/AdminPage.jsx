import { useState } from 'react'
import { Zap } from 'lucide-react'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import AdminOverview from './AdminOverview'
import AdminAnalytics from './AdminAnalytics'
import AdminUsers from './AdminUsers'

// The /admin shell — dark sticky top bar (wordmark + tabs + internal badge +
// avatar) over a light canvas. Admin-gated upstream by <RequireAdmin> in App.jsx
// (the route layer is admin_required server-side); this component assumes the
// viewer is an admin. Three screens switch via top tabs, matching DESIGN_SPECS.
//
// Phase 12: Overview is live; Analytics (GA4) and Users (tiers/audit) are later
// phases of this cycle and render labelled "coming in a later phase" placeholders.

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'users', label: 'Users' },
]

function initials(email) {
  const name = (email || '?').split('@')[0]
  return name.slice(0, 2).toUpperCase()
}

export default function AdminPage({ auth }) {
  useDocumentTitle('Admin · SpreadsheetMillionaire')
  const [tab, setTab] = useState('overview')

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-[#15181c]">
      {/* Dark sticky chrome */}
      <header
        className="sticky top-0 z-10 h-[62px] flex items-center gap-8 px-6 sm:px-8"
        style={{ background: 'linear-gradient(180deg,#14171d,#0b0d11)' }}
      >
        <span className="text-[19px] font-extrabold tracking-tight text-white whitespace-nowrap">
          Spreadsheet<span className="text-amber-400">Millionaire</span>
        </span>

        <nav className="flex items-stretch gap-6 h-full">
          {TABS.map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative h-full text-sm transition ${
                  active ? 'text-white font-bold' : 'text-[#8b9199] font-semibold hover:text-white'
                }`}
              >
                {t.label}
                {active && (
                  <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-amber-400" />
                )}
              </button>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <span
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{
              color: '#f5b829',
              background: 'rgba(245,184,41,.12)',
              border: '1px solid rgba(245,184,41,.3)',
            }}
          >
            <Zap className="w-3 h-3" />
            internal · /admin
          </span>
          <span
            className="w-8 h-8 rounded-full grid place-items-center text-[12px] font-bold text-[#15181c]"
            style={{ background: '#f5b829' }}
            title={auth.user?.email}
          >
            {initials(auth.user?.email)}
          </span>
        </div>
      </header>

      <main className="max-w-[1360px] mx-auto px-6 sm:px-8 pt-[30px] pb-16">
        {tab === 'overview' && <AdminOverview />}
        {tab === 'analytics' && <AdminAnalytics />}
        {tab === 'users' && <AdminUsers />}
      </main>
    </div>
  )
}
