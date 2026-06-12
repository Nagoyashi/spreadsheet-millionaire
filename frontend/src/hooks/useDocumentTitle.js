import { useEffect } from 'react'

// Gives each SPA route a distinct <title>. This is the cheap half of SEO we can
// do without SSR — see DECISIONS.md § "SPA SEO limitation accepted". Crawlers
// that execute JS (Googlebot) pick up the per-route title; the static fallback
// in index.html covers the rest. Call once near the top of a route component:
//
//   useDocumentTitle('FIRE Calculator — SpreadsheetMillionaire')
//
// The title resets to the index.html default when the component unmounts so a
// stale calculator title never lingers on a route that forgot to set its own.

const DEFAULT_TITLE = 'SpreadsheetMillionaire — Free financial planning calculators'

export function useDocumentTitle(title) {
  useEffect(() => {
    if (title) document.title = title
    return () => { document.title = DEFAULT_TITLE }
  }, [title])
}
