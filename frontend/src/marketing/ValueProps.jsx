import { Zap, UserCheck, Save, Lock } from 'lucide-react'

// Four short, true claims. Every one is verifiable against the product today —
// no invented metrics, no "trusted by N users", no testimonials. See
// DECISIONS.md § "Marketing page invents nothing". Copy is final per the
// marketing redesign handoff.

const PROPS = [
  {
    Icon: Zap,
    title: 'Free to use',
    body: "Every published calculator is free, without usage limits — and that doesn't change.",
  },
  {
    Icon: UserCheck,
    title: 'No signup to calculate',
    body: "Run any calculator anonymously. An account only saves your inputs — it's never a wall in front of the math.",
  },
  {
    Icon: Save,
    title: 'Save your scenarios',
    body: 'A free account lets you save, rename and revisit your plans as life changes. Stored privately, per account.',
  },
  {
    Icon: Lock,
    title: 'Private by design',
    body: 'No ads, no trackers, no selling your data. The only cookie is the one that keeps you signed in.',
  },
]

export default function ValueProps() {
  return (
    <section className="bg-gray-50 border-y border-gray-100">
      <div className="max-w-6xl mx-auto px-6 py-20 sm:py-[88px]">
        <div className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-amber-600 mb-3">
            Why SpreadsheetMillionaire
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.02em] text-gray-900">
            Built to be trusted
          </h2>
          <p className="mt-3.5 text-base leading-relaxed text-gray-500 max-w-[480px] mx-auto">
            Honest tools with your privacy intact — no fine print.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PROPS.map(({ Icon, title, body }) => (
            <div
              key={title}
              className="flex flex-col rounded-xl border border-gray-200 bg-white p-6"
            >
              <div className="inline-flex w-10 h-10 items-center justify-center rounded-[10px] bg-amber-50 mb-4">
                <Icon className="w-[19px] h-[19px] text-amber-600" />
              </div>
              <h3 className="text-[15px] font-bold text-gray-900 mb-2">{title}</h3>
              <p className="text-[13.5px] text-gray-500 leading-[1.65]">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
