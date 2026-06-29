import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Horizontal scroll-snap slider for card rows that should scroll sideways rather
// than wrap onto new rows as more items are added (the calculator showcase and
// the "more on the way" strip). Native scroll handles touch/trackpad; the arrows
// (desktop, reveal on hover) nudge by ~one viewport. Children are the cards —
// each should be `shrink-0 snap-start` with a fixed width.
export default function CardSlider({ children, label }) {
  const ref = useRef(null)
  const nudge = (dir) => {
    const el = ref.current
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' })
  }

  return (
    <div className="relative group/slider">
      <div
        ref={ref}
        aria-label={label}
        className="flex gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      <Arrow dir={-1} onClick={() => nudge(-1)} />
      <Arrow dir={1} onClick={() => nudge(1)} />
    </div>
  )
}

function Arrow({ dir, onClick }) {
  const Icon = dir < 0 ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir < 0 ? 'Previous' : 'Next'}
      className={`hidden md:flex absolute top-1/2 -translate-y-1/2 ${
        dir < 0 ? 'left-1' : 'right-1'
      } z-10 w-10 h-10 items-center justify-center rounded-full bg-stone-800/90 backdrop-blur border border-white/10 text-stone-200 shadow-lg transition hover:bg-stone-700 hover:text-white opacity-0 group-hover/slider:opacity-100 focus-visible:opacity-100`}
    >
      <Icon className="w-5 h-5" />
    </button>
  )
}
