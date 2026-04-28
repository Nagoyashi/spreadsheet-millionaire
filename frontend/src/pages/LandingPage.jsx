import { useNavigate } from 'react-router-dom'
import { BarChart2, ArrowRight, LogOut, User } from 'lucide-react'
import { CALCULATORS } from '../calculators/registry'

export default function LandingPage({ auth }) {
  const navigate = useNavigate()

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

          {/* Hero summary card */}
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

          {/* Calculator cards — auto-generated from registry */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CALCULATORS.map(({ type, label, subtitle, description, Icon, color, gradient, badge, badgeLabel }) => (
              <div
                key={type}
                onClick={() => navigate(`/calculator/${type}`)}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg hover:-translate-y-1 transition cursor-pointer group"
              >
                {/* Gradient accent bar */}
                <div className={`h-1.5 rounded-full bg-gradient-to-r ${gradient} mb-5`} />

                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 rounded-lg bg-gray-50">
                    <Icon className={`w-6 h-6 ${color}`} />
                  </div>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${badge}`}>
                    {badgeLabel}
                  </span>
                </div>

                <p className="text-sm font-medium text-gray-500 mb-1">{subtitle}</p>
                <h3 className="text-xl font-bold text-gray-800 mb-3">{label}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-5">{description}</p>

                <div className="flex items-center gap-1 text-blue-600 group-hover:gap-2 transition-all text-sm font-medium">
                  Open calculator <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>

          {/* Auth nudge for logged-out users */}
          {!auth.isAuthenticated && (
            <div className="mt-6 bg-white rounded-lg shadow-md p-6 flex items-center justify-between">
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
