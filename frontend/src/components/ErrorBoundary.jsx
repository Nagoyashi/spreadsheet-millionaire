import { Component } from 'react'

// Catches render-time exceptions anywhere below it (a corrupt saved record, a
// malformed Sankey permalink, an unexpected null) so one throw shows a
// recoverable fallback instead of white-screening the whole SPA. Error
// boundaries have no hooks equivalent, hence a class component. <Suspense> only
// covers lazy-load pending state, not thrown renders — this is the missing net.
export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // No external logging service yet — surface to the console for debugging.
    console.error('Render error caught by ErrorBoundary:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    // Hard links (not <Link>): a full navigation/reload resets the boundary and
    // any corrupt state, which a client-side route change would not.
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold text-white mb-2">Something went wrong</h1>
          <p className="text-stone-400 text-sm mb-6">
            An unexpected error broke this page. Your saved data is safe — try reloading,
            or head back to the calculators.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="bg-amber-400 text-stone-950 font-medium px-4 py-2 rounded-lg hover:bg-amber-300 transition text-sm"
            >
              Reload
            </button>
            <a href="/app" className="text-stone-300 hover:text-white text-sm px-4 py-2">
              Back to calculators
            </a>
          </div>
        </div>
      </div>
    )
  }
}
