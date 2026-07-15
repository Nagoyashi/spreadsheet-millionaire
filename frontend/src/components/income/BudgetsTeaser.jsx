import { Target, PieChart, BellRing } from 'lucide-react'

// Budgets tab — coming-soon placeholder. Per-category budgets are a long-noted
// backlog item (project.md § Future: "Budgets — per-category budgets"); when
// they ship, budgets will be fed by the data already entered in the other tabs
// (transactions, monthly grid). Static teaser only — nothing is wired.

export default function BudgetsTeaser() {
  return (
    <div className="bg-white rounded-lg shadow-md p-10 text-center">
      <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
        <Target className="w-7 h-7 text-emerald-600" />
      </div>
      <h3 className="text-xl font-bold text-gray-800">Budgets — coming soon</h3>
      <p className="text-gray-600 mt-2 max-w-md mx-auto">
        Set a monthly budget per category and watch it fill up from the transactions and monthly
        sums you already track — no double entry.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm text-gray-500">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200">
          <PieChart className="w-4 h-4" />
          Per-category limits
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200">
          <BellRing className="w-4 h-4" />
          Overspend warnings
        </span>
      </div>
    </div>
  )
}
