// Shared Recharts tooltip used across all calculators.
// Pass directly as: <Tooltip content={<ChartTooltip />} />
// Props injected by Recharts: active, payload, label
// fmt — optional formatter function, defaults to plain number string

export default function ChartTooltip({ active, payload, label, fmt = (n) => String(n) }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs min-w-36">
      <p className="font-semibold text-gray-700 mb-2">Year {label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex justify-between gap-4 mb-1">
          <span className="text-gray-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-semibold text-gray-800">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}
