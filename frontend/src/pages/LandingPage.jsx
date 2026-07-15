import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Star, Menu } from 'lucide-react'
import { usePublishedCalculators } from '../calculators/usePublished'
import { useLiveTrackers, useVisibleUpcoming } from '../trackers'
import { useFavourites } from '../hooks/useFavourites'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import AppShell from '../components/AppShell'

// ─── Small toast for unauthenticated star attempt ─────────────────────────────
function AuthToast({ visible }) {
  if (!visible) return null
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 pointer-events-none">
      <Star className="w-4 h-4 text-amber-400" />
      Sign in to save favourites
    </div>
  )
}

export default function LandingPage({ auth }) {
  useDocumentTitle('Calculators — SpreadsheetMillionaire')
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('All')
  const { favourites, toggle } = useFavourites(auth)
  const { publishedCalculators, categories } = usePublishedCalculators()
  const liveTrackers = useLiveTrackers()
  const visibleUpcoming = useVisibleUpcoming()
  const [showAuthToast, setShowAuthToast] = useState(false)
  const toastTimerRef = useRef(null)

  function handleStarClick(e, type) {
    e.stopPropagation()
    if (!auth.isAuthenticated) {
      clearTimeout(toastTimerRef.current)
      setShowAuthToast(true)
      toastTimerRef.current = setTimeout(() => setShowAuthToast(false), 2500)
      return
    }
    toggle(type)
  }

  useEffect(() => () => clearTimeout(toastTimerRef.current), [])

  // Starred calcs float to top within any tab
  const displayed = (() => {
    if (activeCategory === 'Favourites') {
      return publishedCalculators.filter((c) => favourites.includes(c.type))
    }
    const pool =
      activeCategory === 'All'
        ? publishedCalculators
        : publishedCalculators.filter((c) => c.category === activeCategory)
    return [
      ...pool.filter((c) => favourites.includes(c.type)),
      ...pool.filter((c) => !favourites.includes(c.type)),
    ]
  })()

  const tabs = ['Favourites', 'All', ...categories.filter((c) => c !== 'All')]

  return (
    <AppShell auth={auth}>
      {({ openSidebar }) => (
        <>
          <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden flex items-center justify-center min-h-[44px] min-w-[44px] -ml-2 text-gray-500 hover:text-gray-800"
                onClick={openSidebar}
                aria-label="Open sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Financial Calculators</h1>
            </div>
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
                <h2 className="text-2xl font-bold mb-2">Numbers that tell the truth.</h2>
                <p className="text-indigo-100 text-sm leading-relaxed">
                  Use any calculator freely. Create an account to save and revisit your calculations
                  at any time.
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
              {tabs.map((tab) => {
                const isFavTab = tab === 'Favourites'
                const count = isFavTab
                  ? favourites.length
                  : tab === 'All'
                    ? publishedCalculators.length
                    : publishedCalculators.filter((c) => c.category === tab).length
                const isActive = activeCategory === tab
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveCategory(tab)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2.5 sm:py-1.5 rounded-full text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-gray-900 text-white shadow-sm'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400 hover:text-gray-900'
                    }`}
                  >
                    {isFavTab && (
                      <Star className="w-3.5 h-3.5 shrink-0 text-amber-400 fill-amber-400" />
                    )}
                    {tab}
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* ── Calculator grid ──────────────────────────────────────────────── */}
            {displayed.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {displayed.map(
                  ({
                    type,
                    label,
                    subtitle,
                    description,
                    Icon,
                    color,
                    gradient,
                    badge,
                    category,
                  }) => {
                    const isStarred = favourites.includes(type)
                    return (
                      <div
                        key={type}
                        onClick={() => navigate(`/app/calculator/${type}`)}
                        className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 hover:shadow-md hover:-translate-y-1 transition cursor-pointer group flex flex-col"
                      >
                        <div className={`h-1 rounded-full bg-gradient-to-r ${gradient} mb-4`} />
                        <div className="flex items-start justify-between mb-3">
                          <div className="p-2 rounded-lg bg-gray-50">
                            <Icon className={`w-5 h-5 ${color}`} />
                          </div>
                          <span
                            className={`px-2 py-0.5 text-xs font-semibold rounded-full ${badge}`}
                          >
                            {category}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-gray-400 mb-0.5">{subtitle}</p>
                        <h3 className="text-base font-bold text-gray-800 mb-2">{label}</h3>
                        <p className="text-sm sm:text-xs text-gray-500 leading-relaxed mb-4 flex-1">
                          {description}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-blue-600 group-hover:gap-2 transition-all text-xs font-medium">
                            Open <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                          <button
                            onClick={(e) => handleStarClick(e, type)}
                            className={`flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 p-1.5 rounded-full transition-colors ${isStarred ? 'text-amber-400 hover:text-amber-500' : 'text-gray-300 hover:text-amber-300'}`}
                            title={isStarred ? 'Remove from favourites' : 'Add to favourites'}
                          >
                            <Star className={`w-4 h-4 ${isStarred ? 'fill-amber-400' : ''}`} />
                          </button>
                        </div>
                      </div>
                    )
                  }
                )}

                {/* Live trackers — real, revealed tracker tools (from trackers.js).
                  Solid cards that open the tracker. Empty in production while
                  Net Worth ships dark. */}
                {activeCategory === 'All' &&
                  liveTrackers.map(({ slug, label, Icon, to }) => (
                    <div
                      key={slug}
                      onClick={() => navigate(to)}
                      className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition cursor-pointer flex flex-col"
                    >
                      <div className="h-1 rounded-full bg-indigo-500 mb-4" />
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2 rounded-lg bg-indigo-50">
                          <Icon className="w-5 h-5 text-indigo-600" />
                        </div>
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                          Tracker
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-gray-800 mb-2">{label}</h3>
                      <p className="text-sm sm:text-xs text-gray-500 leading-relaxed mb-4 flex-1">
                        Track everything you own and owe, and watch your net worth trend over time.
                      </p>
                      <div className="flex items-center gap-1 text-indigo-600 text-xs font-medium">
                        Open <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ))}

                {/* Coming-soon teasers — appended after the calculators on the All
                  tab. Badged and dashed so they don't read as working tools.
                  visibleUpcoming already excludes anything now live. */}
                {activeCategory === 'All' &&
                  visibleUpcoming.map(({ slug, label, Icon, blurb, eta }) => (
                    <div
                      key={slug}
                      onClick={() => navigate(`/app/coming-soon/${slug}`)}
                      className="bg-white/60 rounded-lg border border-dashed border-gray-300 p-5 hover:shadow-md hover:border-gray-400 transition cursor-pointer flex flex-col"
                    >
                      <div className="h-1 rounded-full bg-gray-200 mb-4" />
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2 rounded-lg bg-gray-50">
                          <Icon className="w-5 h-5 text-gray-400" />
                        </div>
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                          Coming soon
                        </span>
                      </div>
                      <p className="text-xs font-medium text-gray-400 mb-0.5">{eta}</p>
                      <h3 className="text-base font-bold text-gray-700 mb-2">{label}</h3>
                      <p className="text-sm sm:text-xs text-gray-500 leading-relaxed mb-4 flex-1">
                        {blurb}
                      </p>
                      <div className="flex items-center gap-1 text-gray-500 text-xs font-medium">
                        Preview <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Star className="w-10 h-10 text-gray-200 mb-4" />
                {activeCategory === 'Favourites' ? (
                  auth.isAuthenticated ? (
                    <>
                      <p className="text-gray-600 font-medium mb-1">No favourites yet</p>
                      <p className="text-sm text-gray-400">
                        Click the ★ on any calculator to pin it here.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-600 font-medium mb-1">
                        Favourites require an account
                      </p>
                      <p className="text-sm text-gray-400 mb-4">
                        Sign in to save your favourite calculators and access them instantly.
                      </p>
                      <button
                        onClick={() => navigate('/login')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                      >
                        Sign in
                      </button>
                    </>
                  )
                ) : (
                  <p className="text-sm text-gray-400">No calculators in this category yet.</p>
                )}
              </div>
            )}

            {/* Auth nudge */}
            {!auth.isAuthenticated && activeCategory !== 'Favourites' && (
              <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-100 p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-800">Save your calculations</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Create a free account to save, rename, and revisit your work.
                  </p>
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

          <AuthToast visible={showAuthToast} />
        </>
      )}
    </AppShell>
  )
}
