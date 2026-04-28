import { lazy } from 'react'
import { TrendingUp, DollarSign, BarChart2 } from 'lucide-react'

// ─── THE ONLY FILE YOU TOUCH TO ADD A NEW CALCULATOR ─────────────────────────
//
// 1. Create your component in src/calculators/YourCalculator.jsx
//    It must accept:  { initialData, onDataChange }
//
// 2. Add one entry to CALCULATORS below using lazy() for the component.
//
// 3. Add the new type string to the backend calc_type constraint
//    in backend/schemas/calculator_schema.py
//
// That's it. CalculatorPage, LandingPage, routing, and the sidebar
// all derive everything they need from this registry automatically.
//
// ─── Why lazy()? ─────────────────────────────────────────────────────────────
// Each calculator (especially SankeyDiagram with d3 + d3-sankey) is a chunky
// bundle. lazy() means each calculator is only downloaded when the user actually
// navigates to it — not on first page load. CalculatorPage wraps the render in
// <Suspense> to handle the loading state.

export const CALCULATORS = [
  {
    type: 'fire',
    label: 'FIRE Calculator',
    subtitle: 'Financial Independence',
    description: 'Calculate your path to early retirement. Know your number, know your timeline.',
    Icon: TrendingUp,
    color: 'text-emerald-500',
    gradient: 'from-emerald-500 to-teal-600',
    badge: 'bg-emerald-100 text-emerald-800',
    badgeLabel: 'Retirement',
    component: lazy(() => import('./FIRECalculator')),
  },
  {
    type: 'compound',
    label: 'Compound Interest',
    subtitle: 'Wealth Growth',
    description: 'Watch your money grow. Model contributions, rates, and time across any horizon.',
    Icon: DollarSign,
    color: 'text-blue-500',
    gradient: 'from-blue-500 to-indigo-600',
    badge: 'bg-blue-100 text-blue-800',
    badgeLabel: 'Investing',
    component: lazy(() => import('./CompoundInterestCalculator')),
  },
  {
    type: 'sankey',
    label: 'Cash Flow Sankey',
    subtitle: 'Cash Flow Diagram',
    description: 'Visualise where your money comes from and where it goes. Every dollar accounted for.',
    Icon: BarChart2,
    color: 'text-violet-500',
    gradient: 'from-violet-500 to-purple-600',
    badge: 'bg-violet-100 text-violet-800',
    badgeLabel: 'Budgeting',
    component: lazy(() => import('./SankeyDiagram')),
  },
]

// Derived lookups — computed once from CALCULATORS, consumed everywhere else.
// Never write these by hand.
export const CALC_MAP    = Object.fromEntries(CALCULATORS.map(c => [c.type, c]))
export const VALID_TYPES = CALCULATORS.map(c => c.type)
