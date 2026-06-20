import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Wallet, DollarSign, TrendingUp, Home, Gem, CreditCard, ArrowLeft } from 'lucide-react'
import { useNetWorthData } from '../hooks/useNetWorthData'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { fmt } from '../utils/format'

// Net Worth tracker — the "Wealth" page. Auth-gated (the route wraps it in
// RequireAuth). This is the #102 foundation: header, the sticky Net Worth /
// Assets / Liabilities bar, the tab scaffold with live counts, and an Overview
// of the server-computed summary. The per-category CRUD panels (#106) and the
// recharts dashboard (#107) replace the placeholders below.

// Full-precision currency for headline figures (fmt() defaults to compact M/K).
const money = (n) => fmt(n, { compact: false })

const TABS = [
  { id: 'overview', label: 'Overview', Icon: Wallet },
  { id: 'liquid', label: 'Liquid Assets', Icon: DollarSign },
  { id: 'investments', label: 'Investments', Icon: TrendingUp },
  { id: 'real-estate', label: 'Real Estate', Icon: Home },
  { id: 'collectibles', label: 'Collectibles', Icon: Gem },
  { id: 'liabilities', label: 'Liabilities', Icon: CreditCard },
]

function StatCard({ label, value, tone = 'text-gray-800' }) {
  return (
    <div>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl sm:text-3xl font-bold ${tone}`}>{value}</p>
    </div>
  )
}

function Placeholder({ title }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
      <p className="font-medium text-gray-700 mb-1">{title}</p>
      <p className="text-sm">Management for this category is coming in this release.</p>
    </div>
  )
}

function Overview({ summary }) {
  if (!summary) return null
  const c = summary.categories
  const gainTone = summary.lifetime_gain >= 0 ? 'text-green-600' : 'text-red-600'

  const rows = [
    { key: 'liquid_assets', label: 'Liquid Assets' },
    { key: 'investments', label: 'Investments' },
    { key: 'real_estate', label: 'Real Estate' },
    { key: 'collectibles', label: 'Collectibles' },
    { key: 'liabilities', label: 'Liabilities' },
  ]

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-5">Global Financial Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            label="Net Worth"
            value={money(summary.net_worth)}
            tone={summary.net_worth >= 0 ? 'text-gray-800' : 'text-red-600'}
          />
          <StatCard label="Total Assets" value={money(summary.total_assets)} tone="text-blue-600" />
          <StatCard
            label="Total Liabilities"
            value={money(summary.total_liabilities)}
            tone="text-red-600"
          />
          <StatCard
            label="Lifetime Gain / Loss"
            value={money(summary.lifetime_gain)}
            tone={gainTone}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">By category</h3>
        <div className="divide-y divide-gray-100">
          {rows.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between py-2.5">
              <span className="text-sm text-gray-600">
                {label}
                <span className="ml-2 text-xs text-gray-400">
                  {c[key].count} {c[key].count === 1 ? 'item' : 'items'}
                </span>
              </span>
              <span className="text-sm font-semibold text-gray-800">{money(c[key].total)}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-gray-400">
          Allocation charts and net-worth history arrive with the dashboard.
        </p>
      </div>
    </div>
  )
}

export default function WealthPage({ auth }) {
  useDocumentTitle('Net Worth Tracker — SpreadsheetMillionaire')
  const [activeTab, setActiveTab] = useState('overview')

  const { assets, liabilities, investments, properties, summary, loading, error, setError } =
    useNetWorthData(auth.isAuthenticated)

  // Liquid = non-collectible assets; collectibles = asset_type 'custom'.
  const liquidCount = assets.filter((a) => a.asset_type !== 'custom').length
  const collectibleCount = assets.filter((a) => a.asset_type === 'custom').length

  const counts = {
    overview: null,
    liquid: liquidCount,
    investments: investments.length,
    'real-estate': properties.length,
    collectibles: collectibleCount,
    liabilities: liabilities.length,
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <Link to="/app" className="text-xl font-bold text-gray-800 tracking-tight">
          Spreadsheet<span className="text-amber-400">Millionaire</span>
        </Link>
        <Link
          to="/app"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to calculators
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Net Worth</h1>
            <p className="text-gray-600 mt-1">Everything you own and owe, in one place.</p>
          </div>

          {/* Sticky net-worth summary bar */}
          <div className="bg-gradient-to-r from-indigo-600 to-blue-700 rounded-lg shadow-lg p-6 mb-6 text-white sticky top-0 z-10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <p className="text-blue-100 text-sm mb-1">Net Worth</p>
                <p
                  className={`text-3xl sm:text-4xl font-bold ${summary && summary.net_worth < 0 ? 'text-red-200' : 'text-white'}`}
                >
                  {summary ? money(summary.net_worth) : '—'}
                </p>
              </div>
              <div>
                <p className="text-blue-100 text-sm mb-1">Total Assets</p>
                <p className="text-2xl sm:text-3xl font-semibold">
                  {summary ? money(summary.total_assets) : '—'}
                </p>
              </div>
              <div>
                <p className="text-blue-100 text-sm mb-1">Total Liabilities</p>
                <p className="text-2xl sm:text-3xl font-semibold">
                  {summary ? money(summary.total_liabilities) : '—'}
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => setError('')}
                className="font-bold hover:text-red-900"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-md mb-6 overflow-x-auto">
            <div className="flex border-b border-gray-200">
              {TABS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center px-5 py-4 text-sm font-medium whitespace-nowrap transition ${
                    activeTab === id
                      ? 'border-b-2 border-indigo-600 text-indigo-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-2" />
                  {label}
                  {counts[id] !== null && (
                    <span
                      className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                        activeTab === id
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {counts[id]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          {loading ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
              Loading…
            </div>
          ) : (
            <div className="min-h-[400px]">
              {activeTab === 'overview' && <Overview summary={summary} />}
              {activeTab === 'liquid' && <Placeholder title="Liquid Assets" />}
              {activeTab === 'investments' && <Placeholder title="Investments" />}
              {activeTab === 'real-estate' && <Placeholder title="Real Estate" />}
              {activeTab === 'collectibles' && <Placeholder title="Collectibles" />}
              {activeTab === 'liabilities' && <Placeholder title="Liabilities" />}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
