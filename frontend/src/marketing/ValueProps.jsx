import { Zap, UserCheck, Save, ShieldCheck } from 'lucide-react'

// Four short, true claims. Every one is verifiable against the product today —
// no invented metrics, no "trusted by N users", no testimonials. See
// DECISIONS.md § "Marketing page invents nothing".

const PROPS = [
  {
    Icon: Zap,
    title: 'Free to use',
    body: 'Every published calculator is free, with no usage limit. Free while in beta, and the calculators stay free.',
  },
  {
    Icon: UserCheck,
    title: 'No signup to calculate',
    body: 'Run any calculator anonymously. An account is only for saving your inputs — never a wall in front of the math.',
  },
  {
    Icon: Save,
    title: 'Save with an account',
    body: 'Create a free account to save, rename, and revisit your scenarios. Your inputs are stored privately, per account.',
  },
  {
    Icon: ShieldCheck,
    title: 'Privacy-respecting',
    body: 'No ads, no trackers, no selling your data. The only cookie is the one that keeps you signed in.',
  },
]

export default function ValueProps() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
        {PROPS.map(({ Icon, title, body }) => (
          <div key={title} className="flex flex-col">
            <div className="inline-flex w-10 h-10 items-center justify-center rounded-lg bg-amber-400/10 mb-4">
              <Icon className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">{title}</h3>
            <p className="text-sm text-stone-400 leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
