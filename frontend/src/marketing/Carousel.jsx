import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Paginated card carousel: shows a full page of N cards (responsive), advances a
// whole page at a time — auto every `autoMs`, or manually via the side arrows /
// the dots. No partial/cut-off cards: each page is a grid of exactly `perView`
// equal columns, so the last (possibly short) page just left-aligns its cards.
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

export default function Carousel({ items, renderItem, label, autoMs = 5000 }) {
  const perView = usePerView()
  const pageCount = Math.max(1, Math.ceil(items.length / perView))
  const [page, setPage] = useState(0)
  const [paused, setPaused] = useState(false)

  // Keep the page in range when perView (and thus pageCount) changes on resize.
  useEffect(() => {
    setPage((p) => Math.min(p, pageCount - 1))
  }, [pageCount])

  // Autoplay — only with more than one page, paused on hover/focus.
  useEffect(() => {
    if (paused || pageCount <= 1) return undefined
    const id = setInterval(() => setPage((p) => (p + 1) % pageCount), autoMs)
    return () => clearInterval(id)
  }, [paused, pageCount, autoMs])

  const go = (i) => setPage(((i % pageCount) + pageCount) % pageCount)

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
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${page * 100}%)` }}
          >
            {Array.from({ length: pageCount }).map((_, pi) => (
              <div
                key={pi}
                className="shrink-0 w-full grid gap-4 sm:gap-5"
                style={{ gridTemplateColumns: `repeat(${perView}, minmax(0, 1fr))` }}
                aria-hidden={pi !== page}
              >
                {items.slice(pi * perView, pi * perView + perView).map((item, idx) => renderItem(item, idx))}
              </div>
            ))}
          </div>
        </div>

        {pageCount > 1 && (
          <>
            <Arrow dir={-1} onClick={() => go(page - 1)} />
            <Arrow dir={1} onClick={() => go(page + 1)} />
          </>
        )}
      </div>

      {pageCount > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: pageCount }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Go to page ${i + 1}`}
              aria-current={i === page}
              className={`h-2 rounded-full transition-all ${
                i === page ? 'w-6 bg-amber-400' : 'w-2 bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>
      )}
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
