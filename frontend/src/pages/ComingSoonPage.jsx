import { useParams, useNavigate, Navigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { UPCOMING_MAP } from '../upcomingFeatures'

// Build-in-public teaser page for an upcoming tracker, at /coming-soon/:slug.
// An unknown slug redirects to the landing page — same guard idiom as an
// unknown/unpublished calculator type in CalculatorPage.
//
// Visual language matches the rest of the app (gray-100 shell, white card,
// amber brand accent). No email-capture form — there's no backend for it in
// this phase.

export default function ComingSoonPage() {
  const { slug } = useParams()
  const navigate = useNavigate()

  const feature = UPCOMING_MAP[slug]
  if (!feature) return <Navigate to="/" replace />

  const { label, Icon, blurb, eta } = feature

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <Link to="/" className="text-xl font-bold text-gray-800 tracking-tight">
          Spreadsheet<span className="text-amber-400">Millionaire</span>
        </Link>
      </header>

      {/* Centered card */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md text-center">
          <div className="inline-flex p-4 rounded-2xl bg-gray-50 mb-5">
            <Icon className="w-8 h-8 text-amber-500" />
          </div>

          <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 mb-4">
            {eta}
          </span>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3">{label}</h1>

          <p className="text-sm text-gray-500 leading-relaxed mb-2">{blurb}</p>

          <p className="text-sm font-medium text-gray-600 mb-6">
            We're building in public — this is coming soon.
          </p>

          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 sm:py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to calculators
          </button>
        </div>
      </div>
    </div>
  )
}
