import { useNavigate } from 'react-router-dom'

const CALCULATORS = [
  {
    type: 'fire',
    label: 'FIRE',
    full: 'Financial Independence',
    description: 'Calculate your path to early retirement. Know your number, know your timeline.',
    icon: '◈',
  },
  {
    type: 'compound',
    label: 'Compound',
    full: 'Compound Interest',
    description: 'Watch your money grow. Model contributions, rates, and time across any horizon.',
    icon: '◉',
  },
  {
    type: 'sankey',
    label: 'Sankey',
    full: 'Cash Flow Diagram',
    description: 'Visualise where your money comes from and where it goes. Every dollar accounted for.',
    icon: '◫',
  },
]

export default function LandingPage({ auth }) {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col">
      {/* Nav */}
      <nav className="border-b border-stone-800 px-8 py-4 flex items-center justify-between">
        <span className="font-display text-xl text-stone-100 tracking-tight">
          FIN<span className="text-amber-400">trackr</span>
        </span>
        <div className="flex items-center gap-4">
          {auth.isAuthenticated ? (
            <>
              <span className="font-mono text-xs text-stone-500 tracking-widest uppercase">
                {auth.user.email}
              </span>
              <button
                onClick={auth.logout}
                className="font-body text-sm text-stone-400 hover:text-stone-100 transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="font-body text-sm text-stone-400 hover:text-stone-100 transition-colors"
              >
                Sign in
              </button>
              <button
                onClick={() => navigate('/register')}
                className="font-body text-sm bg-amber-400 text-stone-950 px-4 py-1.5 hover:bg-amber-300 transition-colors font-medium"
              >
                Register
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div className="px-8 pt-20 pb-12 max-w-3xl">
        <p className="font-mono text-xs text-amber-400 tracking-widest uppercase mb-4">
          Financial Calculators
        </p>
        <h1 className="font-display text-5xl text-stone-100 leading-tight mb-4">
          Numbers that<br />
          <span className="text-stone-400">tell the truth.</span>
        </h1>
        <p className="font-body text-stone-400 text-lg leading-relaxed max-w-xl">
          Use any calculator freely. Create an account to save and revisit your calculations.
        </p>
      </div>

      {/* Calculator cards */}
      <div className="px-8 pb-20 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl">
        {CALCULATORS.map((calc) => (
          <button
            key={calc.type}
            onClick={() => navigate(`/calculator/${calc.type}`)}
            className="group text-left border border-stone-800 bg-stone-900/50 p-6 hover:border-amber-400/50 hover:bg-stone-900 transition-all duration-200"
          >
            <span className="text-2xl text-amber-400 mb-4 block">{calc.icon}</span>
            <p className="font-mono text-xs text-stone-500 uppercase tracking-widest mb-1">
              {calc.full}
            </p>
            <h2 className="font-display text-2xl text-stone-100 mb-3">
              {calc.label}
            </h2>
            <p className="font-body text-sm text-stone-400 leading-relaxed">
              {calc.description}
            </p>
            <div className="mt-6 flex items-center gap-2 text-stone-600 group-hover:text-amber-400 transition-colors">
              <span className="font-mono text-xs tracking-widest uppercase">Open</span>
              <span className="text-xs">→</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
