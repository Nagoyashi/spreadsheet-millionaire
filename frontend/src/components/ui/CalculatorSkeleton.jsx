// Loading skeleton shown while a lazy calculator chunk downloads.
// Extracted from CalculatorPage so the page stays an orchestrator.

export default function CalculatorSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-5 h-28">
            <div className="flex justify-between mb-3">
              <div className="h-3 bg-gray-100 rounded w-24" />
              <div className="w-8 h-8 bg-gray-100 rounded-lg" />
            </div>
            <div className="h-7 bg-gray-100 rounded w-32 mb-2" />
            <div className="h-2 bg-gray-100 rounded w-20" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg shadow-sm p-6 h-72">
        <div className="h-4 bg-gray-100 rounded w-48 mb-6" />
        <div className="h-48 bg-gray-50 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-6 h-56">
            <div className="h-4 bg-gray-100 rounded w-32 mb-5" />
            {[...Array(3)].map((_, j) => (
              <div key={j} className="mb-4">
                <div className="h-2.5 bg-gray-100 rounded w-24 mb-2" />
                <div className="h-9 bg-gray-50 rounded-lg border border-gray-100" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
