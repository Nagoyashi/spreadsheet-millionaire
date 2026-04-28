import { lazy } from 'react'
import {
  TrendingUp, DollarSign, BarChart2,
  Percent, TrendingDown, Divide,
  CreditCard, Home, Anchor, Shield, Coffee,
} from 'lucide-react'

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
// Each calculator is only downloaded when the user navigates to it.
// CalculatorPage wraps the render in <Suspense> to handle the loading state.

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
  {
    type: 'investment_fee',
    label: 'Investment Fee Impact',
    subtitle: 'Fee Comparison',
    description: 'See exactly how fund fees silently erode your wealth over time. Small % = big money.',
    Icon: Percent,
    color: 'text-red-500',
    gradient: 'from-red-500 to-rose-600',
    badge: 'bg-red-100 text-red-800',
    badgeLabel: 'Investing',
    component: lazy(() => import('./InvestmentFeeCalculator')),
  },
  {
    type: 'inflation',
    label: 'Inflation Calculator',
    subtitle: 'Purchasing Power',
    description: "Understand what today's money will be worth in the future — and how much you need to stay ahead.",
    Icon: TrendingDown,
    color: 'text-orange-500',
    gradient: 'from-orange-400 to-red-500',
    badge: 'bg-orange-100 text-orange-800',
    badgeLabel: 'Planning',
    component: lazy(() => import('./InflationCalculator')),
  },
  {
    type: 'dividend',
    label: 'Dividend Calculator',
    subtitle: 'Passive Income',
    description: 'Model your dividend income stream. See how reinvestment compounds your passive income over time.',
    Icon: Divide,
    color: 'text-teal-500',
    gradient: 'from-teal-500 to-emerald-600',
    badge: 'bg-teal-100 text-teal-800',
    badgeLabel: 'Income',
    component: lazy(() => import('./DividendCalculator')),
  },
  {
    type: 'withdrawal',
    label: 'Withdrawal Plan',
    subtitle: 'Decumulation',
    description: "The other side of FIRE. Model how long your portfolio lasts and whether your withdrawal rate is safe.",
    Icon: TrendingDown,
    color: 'text-indigo-500',
    gradient: 'from-indigo-500 to-blue-600',
    badge: 'bg-indigo-100 text-indigo-800',
    badgeLabel: 'Retirement',
    component: lazy(() => import('./WithdrawalPlanCalculator')),
  },
  {
    type: 'debt_payoff',
    label: 'Debt Payoff',
    subtitle: 'Avalanche vs Snowball',
    description: 'Compare the two debt payoff strategies side by side. See which saves more and which motivates more.',
    Icon: CreditCard,
    color: 'text-rose-500',
    gradient: 'from-rose-500 to-pink-600',
    badge: 'bg-rose-100 text-rose-800',
    badgeLabel: 'Debt',
    component: lazy(() => import('./DebtPayoffCalculator')),
  },
  {
    type: 'mortgage',
    label: 'Mortgage Calculator',
    subtitle: 'Home Loan',
    description: 'Calculate your monthly payments, total interest, and full amortisation schedule.',
    Icon: Home,
    color: 'text-sky-500',
    gradient: 'from-sky-500 to-blue-600',
    badge: 'bg-sky-100 text-sky-800',
    badgeLabel: 'Property',
    component: lazy(() => import('./MortgageCalculator')),
  },
  {
    type: 'coast_fire',
    label: 'Coast FIRE',
    subtitle: 'Semi-Retirement Path',
    description: 'Find out when you can stop contributing and let compounding do the rest of the work.',
    Icon: Anchor,
    color: 'text-cyan-500',
    gradient: 'from-cyan-500 to-teal-600',
    badge: 'bg-cyan-100 text-cyan-800',
    badgeLabel: 'Retirement',
    component: lazy(() => import('./CoastFIRECalculator')),
  },
  {
    type: 'emergency_fund',
    label: 'Emergency Fund',
    subtitle: 'Financial Safety Net',
    description: 'How much do you need? How long to get there? Build your financial foundation first.',
    Icon: Shield,
    color: 'text-green-500',
    gradient: 'from-green-500 to-emerald-600',
    badge: 'bg-green-100 text-green-800',
    badgeLabel: 'Foundation',
    component: lazy(() => import('./EmergencyFundCalculator')),
  },
  {
    type: 'barista_fire',
    label: 'Barista FIRE',
    subtitle: 'Semi-Retirement',
    description: 'Semi-retire early with part-time work. Smaller portfolio needed, more freedom sooner.',
    Icon: Coffee,
    color: 'text-amber-500',
    gradient: 'from-amber-400 to-orange-500',
    badge: 'bg-amber-100 text-amber-800',
    badgeLabel: 'Retirement',
    component: lazy(() => import('./BaristaFIRECalculator')),
  },
]

// Derived lookups — computed once from CALCULATORS, consumed everywhere else.
// Never write these by hand.
export const CALC_MAP    = Object.fromEntries(CALCULATORS.map(c => [c.type, c]))
export const VALID_TYPES = CALCULATORS.map(c => c.type)
