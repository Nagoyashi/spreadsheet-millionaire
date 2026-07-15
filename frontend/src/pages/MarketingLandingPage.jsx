import { useDocumentTitle } from '../hooks/useDocumentTitle'
import MarketingNav from '../marketing/MarketingNav'
import Hero from '../marketing/Hero'
import CalculatorShowcase from '../marketing/CalculatorShowcase'
import ValueProps from '../marketing/ValueProps'
import ComingSoonStrip from '../marketing/ComingSoonStrip'
import CtaBand from '../marketing/CtaBand'
import MarketingFooter from '../marketing/MarketingFooter'

// The public face of the product at /. A logged-in visitor sees this too (no
// auto-redirect into the app) — MarketingNav adapts its CTAs to auth state.
// `auth` arrives as a prop from App.jsx, per the props-not-Context convention.
//
// Light, neutral fintech canvas (white / gray-50, blue-600 actions) visually
// aligned with the app at /app, with amber kept as the brand accent (wordmark,
// eyebrows, badges). The showcase cards bring their per-calculator gradients
// from the registry; a dark slate CTA band closes the page above the footer.

export default function MarketingLandingPage({ auth }) {
  useDocumentTitle('SpreadsheetMillionaire — Free personal finance tools and calculators')

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <MarketingNav auth={auth} />
      <main>
        <Hero />
        <CalculatorShowcase />
        <ValueProps />
        <ComingSoonStrip />
        <CtaBand />
      </main>
      <MarketingFooter />
    </div>
  )
}
