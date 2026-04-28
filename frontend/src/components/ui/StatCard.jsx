// Shared stat card used across all calculators.
// Props:
//   label         — metric label (string)
//   value         — formatted value (string)
//   sub           — secondary line below value (string, optional)
//   Icon          — lucide-react icon component
//   iconClass     — Tailwind text color class for the icon
//   gradientClass — Tailwind gradient classes for the bottom accent bar

export default function StatCard({ label, value, sub, Icon, iconClass, gradientClass }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-5 hover:shadow-lg hover:-translate-y-1 transition">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <div className="p-2 rounded-lg bg-gray-50">
          <Icon className={`w-4 h-4 ${iconClass}`} />
        </div>
      </div>
      <p className="text-4xl font-bold text-gray-800">{value}</p>
      {sub && <p className="text-sm text-gray-400 mt-1">{sub}</p>}
      <div className={`h-1 rounded-full bg-gradient-to-r ${gradientClass} mt-4`} />
    </div>
  )
}
