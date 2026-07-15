import MarketingNav from './MarketingNav'
import MarketingFooter from './MarketingFooter'

// Shared chrome for the legal pages (privacy, terms). Reuses the marketing nav
// and footer so the legal pages sit on the same light canvas as the landing
// page, then renders the body as a single readable prose column.
//
// Prose styling lives here as arbitrary-variant classes on the container, so the
// page components stay plain semantic HTML (<h2>, <p>, <ul>, <strong>, <a>) and
// both legal pages render identically without repeating a styling scheme. There
// is no @tailwindcss/typography dependency — that would be a new package for two
// pages; the descendant selectors below do the same job for free.

export default function LegalLayout({ auth, title, updated, children }) {
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <MarketingNav auth={auth} />

      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">{title}</h1>
          {updated && <p className="mt-3 text-sm text-gray-400">Last updated: {updated}</p>}

          <div
            className="
              mt-10
              [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-10 [&_h2]:mb-3
              [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-gray-900 [&_h3]:mt-6 [&_h3]:mb-2
              [&_p]:text-sm [&_p]:text-gray-600 [&_p]:leading-relaxed [&_p]:mb-4
              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ul]:space-y-1.5
              [&_li]:text-sm [&_li]:text-gray-600 [&_li]:leading-relaxed
              [&_a]:text-blue-600 [&_a]:underline [&_a:hover]:text-blue-700
              [&_strong]:text-gray-900 [&_strong]:font-semibold
            "
          >
            {children}
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  )
}
