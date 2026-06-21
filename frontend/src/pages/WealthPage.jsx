import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Wallet, DollarSign, TrendingUp, Home, Gem, CreditCard, ArrowLeft } from 'lucide-react'
import { useNetWorthData } from '../hooks/useNetWorthData'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { fmt } from '../utils/format'
import CategoryManager from '../components/wealth/CategoryManager'
import Dashboard from '../components/wealth/Dashboard'
import { CATEGORY_CONFIGS } from '../components/wealth/categories'

// Net Worth tracker — the "Wealth" page. Auth-gated (the route wraps it in
// RequireAuth). Header, the sticky Net Worth / Assets / Liabilities bar, the
// tab scaffold with live counts, the Overview dashboard (recharts), and the
// per-category CRUD panels (CategoryManager).

// Full-precision currency for the sticky headline figures (fmt() defaults to compact M/K).
const money = (n) => fmt(n, { compact: false })

const TABS = [
  { id: 'overview', label: 'Overview', Icon: Wallet },
  { id: 'liquid', label: 'Liquid Assets', Icon: DollarSign },
  { id: 'investments', label: 'Investments', Icon: TrendingUp },
  { id: 'real-estate', label: 'Real Estate', Icon: Home },
  { id: 'collectibles', label: 'Collectibles', Icon: Gem },
  { id: 'liabilities', label: 'Liabilities', Icon: CreditCard },
]

export default function WealthPage({ auth }) {
  useDocumentTitle('Net Worth Tracker — SpreadsheetMillionaire')
  const [activeTab, setActiveTab] = useState('overview')

  const nw = useNetWorthData(auth.isAuthenticated)
  const {
    assets,
    liabilities,
    investments,
    properties,
    summary,
    snapshots,
    loading,
    error,
    setError,
  } = nw

  // Liquid = non-collectible assets; collectibles = asset_type 'custom'.
  const liquidAssets = assets.filter((a) => a.asset_type !== 'custom')
  const collectibles = assets.filter((a) => a.asset_type === 'custom')

  const counts = {
    overview: null,
    liquid: liquidAssets.length,
    investments: investments.length,
    'real-estate': properties.length,
    collectibles: collectibles.length,
    liabilities: liabilities.length,
  }

  // Map each CategoryManager tab to its filtered rows + the hook's CRUD trio.
  const RESOURCE_CRUD = {
    asset: { onAdd: nw.addAsset, onUpdate: nw.updateAsset, onDelete: nw.deleteAsset },
    liability: {
      onAdd: nw.addLiability,
      onUpdate: nw.updateLiability,
      onDelete: nw.deleteLiability,
    },
    investment: {
      onAdd: nw.addInvestment,
      onUpdate: nw.updateInvestment,
      onDelete: nw.deleteInvestment,
    },
    property: { onAdd: nw.addProperty, onUpdate: nw.updateProperty, onDelete: nw.deleteProperty },
  }
  const TAB_ITEMS = {
    liquid: liquidAssets,
    collectibles,
    investments,
    'real-estate': properties,
    liabilities,
  }

  function renderManager(tabId) {
    const config = CATEGORY_CONFIGS[tabId]
    return (
      <CategoryManager
        config={config}
        items={TAB_ITEMS[tabId]}
        {...RESOURCE_CRUD[config.resource]}
      />
    )
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
              {activeTab === 'overview' ? (
                <Dashboard summary={summary} snapshots={snapshots} onSnapshot={nw.createSnapshot} />
              ) : (
                renderManager(activeTab)
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
