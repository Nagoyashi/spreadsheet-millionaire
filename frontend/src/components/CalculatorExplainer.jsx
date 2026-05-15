// Pedagogical "What is X?" banner shown at the top of every calculator page.
//
// Driven by the registry — each calculator's entry has an `explainer` field
// ({ heading, body }) and a `gradient` field (Tailwind classes). This
// component just renders them with consistent styling.
//
// The banner uses the calculator's own gradient so it feels native to the
// page. The body text uses a tinted-light variant of the gradient's first
// colour family (e.g. `from-emerald-500` → body text `emerald-50`) so it
// stays readable against the bright background. The mapping is small and
// derived inline — no extra config needed in registry.

// Extracts the colour family from a gradient string.
// `from-emerald-500 to-teal-600` → `emerald`
// `from-amber-400 to-orange-500` → `amber`
function bodyTintClass(gradient) {
  const m = /from-([a-z]+)-\d+/.exec(gradient || '')
  // Tailwind needs literal class strings present in source for the JIT to pick
  // them up. We can't construct them as `${family}-50` and rely on safelisting
  // alone — so we map known families explicitly. Any unmapped family falls back
  // to a safe neutral.
  const family = m?.[1]
  switch (family) {
    case 'emerald': return 'text-emerald-50'
    case 'teal':    return 'text-teal-50'
    case 'blue':    return 'text-blue-50'
    case 'indigo':  return 'text-indigo-50'
    case 'violet':  return 'text-violet-50'
    case 'purple':  return 'text-purple-50'
    case 'red':     return 'text-red-50'
    case 'rose':    return 'text-rose-50'
    case 'orange':  return 'text-orange-50'
    case 'amber':   return 'text-amber-50'
    case 'sky':     return 'text-sky-50'
    case 'cyan':    return 'text-cyan-50'
    case 'green':   return 'text-green-50'
    case 'pink':    return 'text-pink-50'
    default:        return 'text-white/90'
  }
}

export default function CalculatorExplainer({ Icon, gradient, explainer }) {
  if (!explainer?.heading || !explainer?.body) return null

  const tintCls = bodyTintClass(gradient)

  return (
    <div className={`bg-gradient-to-r ${gradient} rounded-lg p-5 text-white`}>
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon className="w-5 h-5" />}
        <h3 className="font-bold">{explainer.heading}</h3>
      </div>
      <p className={`text-sm ${tintCls} leading-relaxed`}>{explainer.body}</p>
    </div>
  )
}
