import { Upload, FileText, Table2, CalendarDays } from 'lucide-react'

// Bulk upload tab — coming-soon placeholder for bank-statement import (the
// third input mode after per-transaction entry and the monthly grid; CSV
// import is roadmapped for v0.16.1, PDF/Kontoauszug extraction is backlog
// #296). Static teaser only: no upload surface exists yet, so nothing is
// wired to accept a file.

export default function BulkUploadTeaser() {
  return (
    <div className="bg-white rounded-lg shadow-md p-10 text-center">
      <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
        <Upload className="w-7 h-7 text-emerald-600" />
      </div>
      <h3 className="text-xl font-bold text-gray-800">Bulk upload — coming soon</h3>
      <p className="text-gray-600 mt-2 max-w-md mx-auto">
        Upload a bank statement and import a whole month of transactions at once — mapped to your
        categories, with a preview before anything is saved.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm text-gray-500">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200">
          <Table2 className="w-4 h-4" />
          CSV export
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200">
          <FileText className="w-4 h-4" />
          PDF statement (Kontoauszug)
        </span>
      </div>
      <p className="text-xs text-gray-400 mt-6 inline-flex items-center gap-1.5">
        <CalendarDays className="w-3.5 h-3.5" />
        Until then, the Monthly entry tab is the fastest way to enter a month in bulk.
      </p>
    </div>
  )
}
