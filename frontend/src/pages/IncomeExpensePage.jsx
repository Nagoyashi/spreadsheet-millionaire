import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LayoutDashboard, ListOrdered, Menu } from 'lucide-react'
import { useIncomeExpenseData } from '../hooks/useIncomeExpenseData'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { fmt } from '../utils/format'
import AppShell from '../components/AppShell'
import TransactionsPanel from '../components/income/TransactionsPanel'
import CashflowDashboard from '../components/income/CashflowDashboard'

// Income & Expense tracker page. Auth-gated (the route wraps it in RequireAuth).
// Header, sticky Income / Expense / Net bar, tabs: the Overview cashflow
// dashboard and the Transactions management panel.

const money = (n) => fmt(n, { compact: false })

const TABS = [
  { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', Icon: ListOrdered },
]

export default function IncomeExpensePage({ auth }) {
  useDocumentTitle('Income & Expense Tracker — SpreadsheetMillionaire')
  const [activeTab, setActiveTab] = useState('overview')

  const {
    transactions,
    summary,
    filters,
    setFilters,
    loading,
    error,
    setError,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  } = useIncomeExpenseData(auth.isAuthenticated)
  const totals = summary?.totals

  return (
    <AppShell auth={auth}>
      {({ openSidebar }) => (
        <>
        {/* Mobile top bar — desktop gets the brand from the sidebar */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button
            className="flex items-center justify-center min-h-[44px] min-w-[44px] -ml-2 text-gray-500 hover:text-gray-800"
            onClick={openSidebar}
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link to="/app" className="text-lg font-bold text-gray-800 tracking-tight">
            Spreadsheet<span className="text-amber-400">Millionaire</span>
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Income &amp; Expenses</h1>
            <p className="text-gray-600 mt-1">
              Track what comes in and goes out{summary ? ` — ${summary.year}` : ''}.
            </p>
          </div>

          {/* Sticky summary bar */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-lg shadow-lg p-6 mb-6 text-white sticky top-0 z-10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <p className="text-emerald-100 text-sm mb-1">Income</p>
                <p className="text-2xl sm:text-3xl font-semibold">
                  {totals ? money(totals.income) : '—'}
                </p>
              </div>
              <div>
                <p className="text-emerald-100 text-sm mb-1">Expenses</p>
                <p className="text-2xl sm:text-3xl font-semibold">
                  {totals ? money(totals.expense) : '—'}
                </p>
              </div>
              <div>
                <p className="text-emerald-100 text-sm mb-1">Net</p>
                <p
                  className={`text-3xl sm:text-4xl font-bold ${totals && totals.net < 0 ? 'text-red-200' : 'text-white'}`}
                >
                  {totals ? money(totals.net) : '—'}
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
                      ? 'border-b-2 border-emerald-600 text-emerald-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-2" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
              Loading…
            </div>
          ) : (
            <div className="min-h-[400px]">
              {activeTab === 'overview' && (
                <CashflowDashboard
                  summary={summary}
                  transactions={transactions}
                  filters={filters}
                  setFilters={setFilters}
                />
              )}
              {activeTab === 'transactions' && (
                <TransactionsPanel
                  transactions={transactions}
                  filters={filters}
                  setFilters={setFilters}
                  availableYears={summary?.available_years}
                  onAdd={addTransaction}
                  onUpdate={updateTransaction}
                  onDelete={deleteTransaction}
                />
              )}
            </div>
          )}
        </div>
        </main>
        </>
      )}
    </AppShell>
  )
}
