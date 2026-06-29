import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Continuous one-card-at-a-time carousel. Shows `perView` cards (responsive) and
// shifts by a SINGLE card each step — the next card slides in from the right, the
// leftmost slides out. Advances automatically (pause on hover/focus) or manually
// via the side arrows. Loops seamlessly by cloning `perView` cards on each end and
// snapping back without animation once a clone set scrolls into view.
//
// `items` is the data array; `renderItem(item, index)` returns each card.

function perViewFor(width) {
  if (width >= 1280) return 4
  if (width >= 1024) return 3
  if (width >= 640) return 2
  return 1
}

function usePerView() {
  const [n, setN] = useState(() =>
    typeof window === 'undefined' ? 4 : perViewFor(window.innerWidth),
  )
  useEffect(() => {
    const onResize = () => setN(perViewFor(window.innerWidth))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return n
}

export default function Carousel({ items, renderItem, label, autoMs = 3500 }) {
  const perView = usePerView()
  const n = items.length
  const scrollable = n > perView
  const k = perView // clones per side

  // Track = [lead clones][real items][trail clones]; real items start at index k.
  const track = scrollable ? [...items.slice(n - k), ...items, ...items.slice(0, k)] : items
  const L = track.length

  const [pos, setPos] = useState(k)
  const [animate, setAnimate] = useState(true)
  const [paused, setPaused] = useState(false)

  // Reset to the first real card when the clone count (perView) changes.
  useEffect(() => {
    setAnimate(false)
    setPos(k)
  }, [k, n])

  // Re-enable the transition on the frame after a non-animated snap.
  useEffect(() => {
    if (animate) return undefined
    const r = requestAnimationFrame(() => setAnimate(true))
    return () => cancelAnimationFrame(r)
  }, [animate])

  // Autoplay — one card forward per tick.
  useEffect(() => {
    if (!scrollable || paused) return undefined
    const id = setInterval(() => setPos((p) => p + 1), autoMs)
    return () => clearInterval(id)
  }, [scrollable, paused, autoMs])

  // Seamless wrap: once we've animated into a clone set, snap back by n with the
  // transition off so it's invisible.
  const onTransitionEnd = () => {
    if (!scrollable) return
    if (pos >= k + n) {
      setAnimate(false)
      setPos((p) => p - n)
    } else if (pos < k) {
      setAnimate(false)
      setPos((p) => p + n)
    }
  }

  if (!scrollable) {
    return (
      <div
        className="grid gap-4 sm:gap-5"
        style={{ gridTemplateColumns: `repeat(${Math.max(n, 1)}, minmax(0, 1fr))` }}
        aria-label={label}
      >
        {items.map((it, i) => renderItem(it, i))}
      </div>
    )
  }

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="relative">
        <div className="overflow-hidden" aria-label={label}>
          <div
            className="flex items-stretch"
            style={{
              width: `${(L / perView) * 100}%`,
              transform: `translateX(-${pos * (100 / L)}%)`,
              transition: animate ? 'transform 600ms ease' : 'none',
            }}
            onTransitionEnd={onTransitionEnd}
          >
            {track.map((it, i) => (
              <div
                key={i}
                className="shrink-0 px-2"
                style={{ width: `${100 / L}%` }}
                aria-hidden={i < k || i >= k + n}
              >
                {renderItem(it, i)}
              </div>
            ))}
          </div>
        </div>

        <Arrow dir={-1} onClick={() => setPos((p) => p - 1)} />
        <Arrow dir={1} onClick={() => setPos((p) => p + 1)} />
      </div>
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
        dir < 0 ? 'left-0 -translate-x-1/2' : 'right-0 translate-x-1/2'
      } z-10 w-10 h-10 items-center justify-center rounded-full bg-stone-800 border border-white/10 text-stone-200 shadow-lg transition hover:bg-stone-700 hover:text-white`}
    >
      <Icon className="w-5 h-5" />
    </button>
  )
}
