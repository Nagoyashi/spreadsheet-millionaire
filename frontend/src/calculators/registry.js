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
//    Use the useCalculatorInputs hook for input state, fmt() from utils/format
//    for currency, and include `version: 1` as the first field in DEFAULTS.
//
// 2. Add one entry to CALCULATORS below using lazy() for the component.
//    Pick a category from: 'Retirement' | 'Investing' | 'Budgeting' | 'Debt & Property'
//    New categories are picked up automatically by the LandingPage filter bar.
//    Set `published: true` to show it in the public app, `false` to keep it in
//    the codebase but hidden from the sidebar, landing grid, and routing guard.
//    `published` is REQUIRED on every entry. The four-calculator public MVP is
//    the only set with `published: true`; the rest re-enable one at a time as
//    build-in-public patches by flipping the flag. See DECISIONS.md
//    § "MVP narrowing via `published` flag".
//
// 3. Add the new type string to VALID_CALC_TYPES in backend/calc_types.py.
//    This is the single backend source — both schemas/calculator_schema.py
//    and db_init.py import from it. Then run `python db_init.py` once to
//    migrate the CHECK constraint on saved_calculators.
//
// Note: badge on each card uses `category` automatically — no separate badgeLabel needed.

export const CALCULATORS = [
  {
    type: 'fire',
    published: true,
    label: 'FIRE Calculator',
    subtitle: 'Financial Independence',
    description: 'Calculate your path to early retirement. Know your number, know your timeline.',
    explainer: {
      heading: 'What is FIRE?',
      body: 'Financial Independence, Retire Early. Save aggressively until your investments can cover your expenses indefinitely — typically when your portfolio reaches 25× your annual spending.',
    },
    category: 'Retirement',
    Icon: TrendingUp,
    color: 'text-emerald-500',
    gradient: 'from-emerald-500 to-teal-600',
    badge: 'bg-emerald-100 text-emerald-800',
    component: lazy(() => import('./FIRECalculator')),
  },
  {
    type: 'compound',
    published: true,
    label: 'Compound Interest',
    subtitle: 'Wealth Growth',
    description: 'Watch your money grow. Model contributions, rates, and time across any horizon.',
    explainer: {
      heading: 'What is compound interest?',
      body: 'Earnings on your earnings. Each year your returns generate their own returns, so the curve gets steeper the longer you wait — time in the market is the most valuable variable.',
    },
    category: 'Investing',
    Icon: DollarSign,
    color: 'text-blue-500',
    gradient: 'from-blue-500 to-indigo-600',
    badge: 'bg-blue-100 text-blue-800',
    component: lazy(() => import('./CompoundInterestCalculator')),
  },
  {
    type: 'sankey',
    published: false,
    label: 'Cash Flow Sankey',
    subtitle: 'Cash Flow Diagram',
    description: 'Visualise where your money comes from and where it goes. Every dollar accounted for.',
    explainer: {
      heading: 'What is a Sankey diagram?',
      body: "A flow chart where the width of each stream is proportional to the amount it carries. Map your income on the left and your spending on the right to see exactly where every dollar lands.",
    },
    category: 'Budgeting',
    Icon: BarChart2,
    color: 'text-violet-500',
    gradient: 'from-violet-500 to-purple-600',
    badge: 'bg-violet-100 text-violet-800',
    component: lazy(() => import('./SankeyDiagram')),
  },
  {
    type: 'investment_fee',
    published: false,
    label: 'Investment Fee Impact',
    subtitle: 'Fee Comparison',
    description: 'See exactly how fund fees silently erode your wealth over time. Small % = big money.',
    explainer: {
      heading: 'Why do fees matter?',
      body: 'A 1% fee sounds small but compounds against you the same way returns compound for you. Over 30 years, the difference between a 0.1% and 1% expense ratio can cost you a quarter of your final portfolio.',
    },
    category: 'Investing',
    Icon: Percent,
    color: 'text-red-500',
    gradient: 'from-red-500 to-rose-600',
    badge: 'bg-red-100 text-red-800',
    component: lazy(() => import('./InvestmentFeeCalculator')),
  },
  {
    type: 'inflation',
    published: false,
    label: 'Inflation Calculator',
    subtitle: 'Purchasing Power',
    description: "Understand what today's money will be worth in the future — and how much you need to stay ahead.",
    explainer: {
      heading: 'What does inflation do to your money?',
      body: "Cash sitting still loses value every year. At 3% inflation, $100 today buys what $74 will buy in a decade — your savings need to outpace this just to stand still.",
    },
    category: 'Budgeting',
    Icon: TrendingDown,
    color: 'text-orange-500',
    gradient: 'from-orange-400 to-red-500',
    badge: 'bg-orange-100 text-orange-800',
    component: lazy(() => import('./InflationCalculator')),
  },
  {
    type: 'dividend',
    published: false,
    label: 'Dividend Calculator',
    subtitle: 'Passive Income',
    description: 'Model your dividend income stream. See how reinvestment compounds your passive income over time.',
    explainer: {
      heading: 'What is dividend investing?',
      body: "Some companies pay shareholders a slice of profits each quarter. Reinvest those payments and your share count grows on its own — eventually the dividends alone can cover your living expenses.",
    },
    category: 'Investing',
    Icon: Divide,
    color: 'text-teal-500',
    gradient: 'from-teal-500 to-emerald-600',
    badge: 'bg-teal-100 text-teal-800',
    component: lazy(() => import('./DividendCalculator')),
  },
  {
    type: 'withdrawal',
    published: false,
    label: 'Withdrawal Plan',
    subtitle: 'Decumulation',
    description: "The other side of FIRE. Model how long your portfolio lasts and whether your withdrawal rate is safe.",
    explainer: {
      heading: 'What is a withdrawal plan?',
      body: 'Once you stop saving and start spending your portfolio, the question becomes: how much can you take each year without running out? The classic "4% rule" gives you a starting point — your real plan depends on market conditions and lifespan.',
    },
    category: 'Retirement',
    Icon: TrendingDown,
    color: 'text-indigo-500',
    gradient: 'from-indigo-500 to-blue-600',
    badge: 'bg-indigo-100 text-indigo-800',
    component: lazy(() => import('./WithdrawalPlanCalculator')),
  },
  {
    type: 'debt_payoff',
    published: true,
    label: 'Debt Payoff',
    subtitle: 'Avalanche vs Snowball',
    description: 'Compare the two debt payoff strategies side by side. See which saves more and which motivates more.',
    explainer: {
      heading: 'Avalanche vs snowball — what\'s the difference?',
      body: 'Avalanche targets the highest interest rate first and minimises total interest paid. Snowball targets the smallest balance first and gives you quick wins to keep momentum. Math favours avalanche; psychology often favours snowball.',
    },
    category: 'Debt & Property',
    Icon: CreditCard,
    color: 'text-rose-500',
    gradient: 'from-rose-500 to-pink-600',
    badge: 'bg-rose-100 text-rose-800',
    component: lazy(() => import('./DebtPayoffCalculator')),
  },
  {
    type: 'mortgage',
    published: false,
    label: 'Mortgage Calculator',
    subtitle: 'Home Loan',
    description: 'Calculate your monthly payments, total interest, and full amortisation schedule.',
    explainer: {
      heading: 'How does a mortgage work?',
      body: 'You pay the same amount each month, but in the early years most of it goes to interest. The principal portion grows slowly at first, then accelerates — which is why a one-off extra payment in year 1 saves far more than the same payment in year 20.',
    },
    category: 'Debt & Property',
    Icon: Home,
    color: 'text-sky-500',
    gradient: 'from-sky-500 to-blue-600',
    badge: 'bg-sky-100 text-sky-800',
    component: lazy(() => import('./MortgageCalculator')),
  },
  {
    type: 'coast_fire',
    published: false,
    label: 'Coast FIRE',
    subtitle: 'Semi-Retirement Path',
    description: 'Find out when you can stop contributing and let compounding do the rest of the work.',
    explainer: {
      heading: 'What is Coast FIRE?',
      body: "The point where your invested savings will grow into a full retirement nest egg on their own — even if you never add another dollar. After that, you only need to earn enough to cover your living expenses; the heavy lifting is done.",
    },
    category: 'Retirement',
    Icon: Anchor,
    color: 'text-cyan-500',
    gradient: 'from-cyan-500 to-teal-600',
    badge: 'bg-cyan-100 text-cyan-800',
    component: lazy(() => import('./CoastFIRECalculator')),
  },
  {
    type: 'emergency_fund',
    published: true,
    label: 'Emergency Fund',
    subtitle: 'Financial Safety Net',
    description: 'How much do you need? How long to get there? Build your financial foundation first.',
    explainer: {
      heading: 'What is an emergency fund?',
      body: "A buffer of easily-accessible cash — typically 3–6 months of essential expenses — that keeps a job loss, medical bill, or broken car from forcing you into debt. It's the foundation everything else sits on.",
    },
    category: 'Budgeting',
    Icon: Shield,
    color: 'text-green-500',
    gradient: 'from-green-500 to-emerald-600',
    badge: 'bg-green-100 text-green-800',
    component: lazy(() => import('./EmergencyFundCalculator')),
  },
  {
    type: 'barista_fire',
    published: false,
    label: 'Barista FIRE',
    subtitle: 'Semi-Retirement',
    description: 'Semi-retire early with part-time work. Smaller portfolio needed, more freedom sooner.',
    explainer: {
      heading: 'What is Barista FIRE?',
      body: 'Semi-retire early with a smaller portfolio by working part-time to cover some expenses. Your investments cover the rest — and you keep growing until full FIRE if you choose.',
    },
    category: 'Retirement',
    Icon: Coffee,
    color: 'text-amber-500',
    gradient: 'from-amber-400 to-orange-500',
    badge: 'bg-amber-100 text-amber-800',
    component: lazy(() => import('./BaristaFIRECalculator')),
  },
]

// Derived lookups — computed once, consumed everywhere. Never write by hand.
export const CALC_MAP    = Object.fromEntries(CALCULATORS.map(c => [c.type, c]))
export const VALID_TYPES = CALCULATORS.map(c => c.type)

// The public MVP surface. Every user-facing enumeration (sidebar nav, landing
// grid, category tabs, routing guard) derives from this — never re-filter the
// full CALCULATORS list in a consumer, and never maintain a second list.
export const PUBLISHED_CALCULATORS = CALCULATORS.filter(c => c.published)
export const PUBLISHED_TYPES       = PUBLISHED_CALCULATORS.map(c => c.type)

// All unique categories among PUBLISHED calculators, in first-appearance order.
// Deriving from the published set means a category with no published calculator
// never renders as an empty group. Publishing a calculator in a new category
// adds that category here automatically.
export const CATEGORIES = ['All', ...new Set(PUBLISHED_CALCULATORS.map(c => c.category))]
