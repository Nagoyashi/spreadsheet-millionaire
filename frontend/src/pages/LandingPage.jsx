import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart2, ArrowRight, LogOut, User, Star } from 'lucide-react'
import { CALCULATORS, CATEGORIES } from '../calculators/registry'

const FAVOURITES_KEY = 'fintrackr_favourites'

function useFavourites() {
  const [favourites, setFavourites] = useState(() => {
    try { return JSON.parse(localStorage.getItem(FAVOURITES_KEY)) || [] }
    catch { return [] }
  })

  function toggle(type) {
    setFavourites(prev => {
      const next = prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
      localStorage.setItem(FAVOURITES_KEY, JSON.stringify(next))
      return next
    })
  }

  return { favourites, toggle }
}

export default function LandingPage({ auth }) {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('All')
  const { favourites, toggle } = useFavourites()

  // Build the displayed list:
  //   - Favourites tab: only starred calcs
  //   - Any other tab: filter by category, starred calcs sorted to front
  const displayed = (() => {
    if (activeCategory === 'Favourites') {
      return CALCULATORS.filter(c => favourites.includes(c.type))
    }
    const pool = activeCategory === 'All'
      ? CALCULATORS
      : CALCULATORS.filter(c => c.category === activeCategory)
    const starred   = pool.filter(c => favourites.includes(c.type))
    const unstarred = pool.filter(c => !favourites.includes(c.type))
    return [...starred, ...unstarred]
  })()

  // All tabs: Favourites (if any starred) + All + categories
  const tabs = [
    ...(favourites.length > 0 ? ['Favourites'] : []),
    'All',
    ...CATEGORIES.filter(c => c !== 'All'),
  ]

  return (
    <div className="min-h-screen flex">

      {/* ── Dark Sidebar ─────────────────────────────────────────────────── */}
      <aside className="w-64 shrink-0 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex flex-col min-h-screen">

        {/* Brand */}
        <div className="px-6 py-5 border-b border-white/10">
          <span className="text-xl font-bold text-white tracking-tight">
            FIN<span className="text-amber-400">trackr</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/10 text-white font-medium text-sm">
            <BarChart2 className="w-5 h-5 text-amber-400" />
            Calculators
          </div>
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-white/10">
          {auth.isAuthenticated ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-2">
                <User className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="text-xs text-gray-400 truncate">{auth.user.email}</span>
              </div>
              <button
                onClick={auth.logout}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition text-sm"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => navigate('/login')}
                className="w-full px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition text-sm text-left"
              >
                Sign in
              </button>
              <button
                onClick={() => navigate('/register')}
                className="w-full px-3 py-2 rounded-lg bg-amber-400 text-gray-900 font-medium text-sm hover:bg-amber-300 transition text-center"
              >
                Create account
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Light Content Area ────────────────────────────────────────────── */}
      <div className="flex-1 bg-gray-100 overflow-y-auto">

        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800">Financial Calculators</h1>
          {!auth.isAuthenticated && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/login')}
                className="text-sm text-gray-600 hover:text-gray-900 transition"
              >
                Sign in
              </button>
              <button
                onClick={() => navigate('/register')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
              >
                Register free
              </button>
            </div>
          )}
        </header>

        <main className="p-6 max-w-7xl mx-auto">

          {/* Hero */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-6 text-white mb-6">
            <div className="max-w-xl">
              <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-white/20 text-white mb-3">
                Free to use
              </span>
              <h2 className="text-2xl font-bold mb-2">Numbers that tell the truth.</h2>
              <p className="text-indigo-100 text-sm leading-relaxed">
                Use any calculator freely. Create an account to save and revisit your calculations at any time.
              </p>
              {!auth.isAuthenticated && (
                <button
                  onClick={() => navigate('/register')}
                  className="mt-4 bg-white text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-50 transition text-sm font-medium inline-flex items-center gap-2"
                >
                  Get started free <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* ── Filter bar ──────────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 flex-wrap mb-5">
            {tabs.map(tab => {
              const isFavTab = tab === 'Favourites'
              const count = isFavTab
                ? favourites.length
                : tab === 'All'
                  ? CALCULATORS.length
                  : CALCULATORS.filter(c => c.category === tab).length
              const isActive = activeCategory === tab

              return (
                <button
                  key={tab}
                  onClick={() => setActiveCategory(tab)}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400 hover:text-gray-900'
                  }`}
                >
                  {isFavTab && (
                    <Star className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400 fill-amber-400' : 'text-amber-400 fill-amber-400'}`} />
                  )}
                  {tab}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* ── Calculator grid ──────────────────────────────────────────────── */}
          {displayed.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {displayed.map(({ type, label, subtitle, description, Icon, color, gradient, badge, category }) => {
                const isStarred = favourites.includes(type)
                return (
                  <div
                    key={type}
                    onClick={() => navigate(`/calculator/${type}`)}
                    className="relative bg-white rounded-lg shadow-sm border border-gray-100 p-5 hover:shadow-md hover:-translate-y-1 transition cursor-pointer group"
                  >
                    {/* Star button */}
                    <button
                      onClick={e => { e.stopPropagation(); toggle(type) }}
                      className={`absolute top-3 right-3 p-1 rounded-full transition-colors ${
                        isStarred
                          ? 'text-amber-400'
                          : 'text-gray-200 hover:text-amber-300'
                      }`}
                      title={isStarred ? 'Remove from favourites' : 'Add to favourites'}
                    >
                      <Star className={`w-4 h-4 ${isStarred ? 'fill-amber-400' : ''}`} />
                    </button>

                    {/* Gradient accent bar */}
                    <div className={`h-1 rounded-full bg-gradient-to-r ${gradient} mb-4`} />

                    <div className="flex items-start justify-between mb-3 pr-4">
                      <div className="p-2 rounded-lg bg-gray-50">
                        <Icon className={`w-5 h-5 ${color}`} />
                      </div>
                      {/* Badge now uses category — matches filter tabs exactly */}
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${badge}`}>
                        {category}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-gray-400 mb-0.5">{subtitle}</p>
                    <h3 className="text-base font-bold text-gray-800 mb-2">{label}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed mb-4">{description}</p>

                    <div className="flex items-center gap-1 text-blue-600 group-hover:gap-2 transition-all text-xs font-medium">
                      Open <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400 text-sm">
              {activeCategory === 'Favourites'
                ? 'No favourites yet. Click the ★ on any calculator to add it here.'
                : 'No calculators in this category yet.'
              }
            </div>
          )}

          {/* Auth nudge */}
          {!auth.isAuthenticated && (
            <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-100 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-800">Save your calculations</h3>
                <p className="text-sm text-gray-500 mt-1">Create a free account to save, rename, and revisit your work.</p>
              </div>
              <button
                onClick={() => navigate('/register')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium shrink-0 ml-4"
              >
                Create account
              </button>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
