import { useDocumentTitle } from '../hooks/useDocumentTitle'
import MarketingNav from '../marketing/MarketingNav'
import Hero from '../marketing/Hero'
import CalculatorShowcase from '../marketing/CalculatorShowcase'
import ValueProps from '../marketing/ValueProps'
import ComingSoonStrip from '../marketing/ComingSoonStrip'
import MarketingFooter from '../marketing/MarketingFooter'

// The public face of the product at /. A logged-in visitor sees this too (no
// auto-redirect into the app) — MarketingNav adapts its CTAs to auth state.
// `auth` arrives as a prop from App.jsx, per the props-not-Context convention.
//
// The page is a calm stone-950 canvas with a single amber accent; the showcase
// cards bring their per-calculator gradients from the registry, so the rest of
// the page stays quiet and lets them carry the colour.

export default function MarketingLandingPage({ auth }) {
  useDocumentTitle('SpreadsheetMillionaire — Free personal finance tools and calculators')

  return (
    <div className="min-h-screen bg-stone-950 text-white">
      <MarketingNav auth={auth} />
      <main>
        <Hero />
        <CalculatorShowcase />
        <ValueProps />
        <ComingSoonStrip />
      </main>
      <MarketingFooter />
    </div>
  )
}
