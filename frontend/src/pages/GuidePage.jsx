import { useState } from 'react'
import { Search, Play, ArrowRight, Image as ImageIcon } from 'lucide-react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import MarketingNav from '../marketing/MarketingNav'
import MarketingFooter from '../marketing/MarketingFooter'
import MarketingPageHero from '../marketing/MarketingPageHero'
import { SuperadminPreviewBanner } from '../marketing/SuperadminPreview'

// /guide — the SEO education hub (articles + videos), per the marketing-pages
// design handoff (NEW-PAGES.md § Guide). Superadmin-only draft: routed through
// <SuperadminPreview> in App.jsx; public visitors keep the coming-soon page.
//
// ── Placeholder content ─────────────────────────────────────────────────────
// Every article/video below (titles, excerpts, read times, durations) is an
// illustrative placeholder from the design draft. The real Guide pulls from a
// CMS/markdown pipeline in a later cycle — ship publicly with real content
// only. Cards are intentionally inert (no hrefs): there are no article routes
// yet, and dead "#" links would be worse than none.

const CATEGORIES = ['All', 'Basics', 'Investing', 'FIRE', 'Debt', 'Real estate', 'Taxes']

// Category pill tints (from the prototype): Investing blue, FIRE emerald,
// Debt rose, Basics green.
const CATEGORY_PILL = {
  Investing: 'bg-blue-50 text-blue-700',
  FIRE: 'bg-emerald-50 text-emerald-800',
  Debt: 'bg-rose-50 text-rose-700',
  Basics: 'bg-green-50 text-green-800',
}

const FEATURED_ARTICLE = {
  category: 'Investing',
  title: 'The 15-minute guide to your first ETF',
  excerpt:
    'What an ETF actually is, why costs matter more than picking winners, and the exact steps from opening an account to your first savings plan.',
  readTime: '12 min read',
  updated: 'Updated July 2026',
}

const ARTICLES = [
  {
    category: 'FIRE',
    title: 'What is FIRE, really?',
    excerpt:
      "Financial independence isn't about never working — it's about making work optional. The math behind the movement.",
    readTime: '8 min read',
  },
  {
    category: 'Investing',
    title: 'Compound interest, explained with one chart',
    excerpt:
      'Why the last ten years of a 30-year plan earn more than the first twenty — and what that means for starting today.',
    readTime: '6 min read',
  },
  {
    category: 'Debt',
    title: 'Avalanche vs snowball: pick your strategy',
    excerpt:
      'One saves the most interest, the other keeps you motivated. How to choose — and why finishing beats optimising.',
    readTime: '7 min read',
  },
  {
    category: 'Basics',
    title: 'How big should your emergency fund be?',
    excerpt:
      '3–6 months is the rule of thumb — but your number depends on your job, your family, and your fixed costs.',
    readTime: '5 min read',
  },
  {
    category: 'Investing',
    title: 'Index funds vs. single stocks',
    excerpt:
      "Most professionals don't beat the index. What that means for your portfolio — and when stock picking still makes sense.",
    readTime: '9 min read',
  },
  {
    category: 'Basics',
    title: 'The order of operations for your money',
    excerpt:
      'Emergency fund or investing first? Pay off debt or save? A simple decision tree for every spare dollar.',
    readTime: '10 min read',
  },
]

const VIDEOS = [
  { title: 'ETFs in 10 minutes', duration: '10:24' },
  { title: 'Your first budget that sticks', duration: '8:12' },
  { title: 'The 4% rule, explained', duration: '12:40' },
]

// Neutral gray "image slot" — the drafts reserve image space but no assets
// exist yet, so render a quiet placeholder block instead.
function ImageSlot({ className = '' }) {
  return (
    <div className={`bg-gray-100 flex items-center justify-center ${className}`}>
      <ImageIcon className="w-6 h-6 text-gray-300" aria-hidden="true" />
    </div>
  )
}

function CategoryPill({ category }) {
  return (
    <span
      className={`inline-flex self-start text-[11px] font-semibold uppercase tracking-[0.04em] px-2.5 py-[3px] rounded-full ${
        CATEGORY_PILL[category] ?? 'bg-gray-100 text-gray-600'
      }`}
    >
      {category}
    </span>
  )
}

export default function GuidePage({ auth }) {
  useDocumentTitle('Guide · SpreadsheetMillionaire')
  const [category, setCategory] = useState('All')
  const [query, setQuery] = useState('')

  // Client-side filter over the placeholder set — chips narrow by category,
  // the search box narrows by title/excerpt. Real search moves server-side
  // with the CMS pipeline.
  const matches = (article) => {
    const inCategory = category === 'All' || article.category === category
    const q = query.trim().toLowerCase()
    const inQuery =
      q === '' ||
      article.title.toLowerCase().includes(q) ||
      article.excerpt.toLowerCase().includes(q)
    return inCategory && inQuery
  }

  const showFeatured = matches(FEATURED_ARTICLE)
  const visibleArticles = ARTICLES.filter(matches)

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <MarketingNav auth={auth} />
      <SuperadminPreviewBanner />

      <main className="flex-1">
        <MarketingPageHero
          eyebrow="Guide"
          title="Learn how money actually works."
          sub="Plain-language articles and videos on investing, FIRE, debt and everything in between — written for people starting out, not finance professionals."
        >
          {/* Search */}
          <div className="mt-8 mx-auto max-w-[560px] relative">
            <Search
              className="w-[18px] h-[18px] text-gray-400 absolute left-4 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search articles…"
              aria-label="Search articles"
              className="w-full h-[50px] pl-11 pr-4 border border-gray-300 rounded-[10px] text-[15px] text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400"
            />
          </div>

          {/* Category chips */}
          <div className="mt-[22px] flex justify-center gap-2 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={`inline-flex items-center px-4 py-2.5 sm:py-2 rounded-full text-[13.5px] font-medium transition ${
                  category === c
                    ? 'bg-gray-900 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </MarketingPageHero>

        {/* Featured article */}
        {showFeatured && (
          <section className="max-w-6xl mx-auto px-6 pt-14">
            <article className="grid grid-cols-1 md:grid-cols-2 border border-gray-200 rounded-[14px] overflow-hidden transition-shadow hover:shadow-[0_12px_32px_-12px_rgba(17,24,39,0.18)]">
              <ImageSlot className="min-h-[200px] md:min-h-[300px]" />
              <div className="p-7 md:px-10 md:py-9 flex flex-col justify-center">
                <div className="flex gap-2 mb-3.5">
                  <CategoryPill category={FEATURED_ARTICLE.category} />
                  <span className="inline-flex text-[11px] font-semibold uppercase tracking-[0.04em] px-2.5 py-[3px] rounded-full bg-amber-50 text-amber-700">
                    Featured
                  </span>
                </div>
                <h2 className="text-[27px] leading-[1.25] font-bold tracking-[-0.02em] mb-3">
                  {FEATURED_ARTICLE.title}
                </h2>
                <p className="text-[15px] leading-[1.65] text-gray-500 mb-[18px]">
                  {FEATURED_ARTICLE.excerpt}
                </p>
                <div className="flex items-center gap-3.5 text-[13px] text-gray-400">
                  <span>{FEATURED_ARTICLE.readTime}</span>
                  <span>·</span>
                  <span>{FEATURED_ARTICLE.updated}</span>
                </div>
                <span className="mt-[18px] inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-blue-600">
                  Read the guide <ArrowRight className="w-[15px] h-[15px]" />
                </span>
              </div>
            </article>
          </section>
        )}

        {/* Article grid */}
        <section className="max-w-6xl mx-auto px-6 pt-12">
          {visibleArticles.length === 0 && !showFeatured ? (
            <p className="text-center text-sm text-gray-400 py-10">
              No articles here yet — more are on the way.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {visibleArticles.map((article) => (
                <article
                  key={article.title}
                  className="flex flex-col border border-gray-200 rounded-xl overflow-hidden transition duration-150 hover:shadow-[0_8px_24px_-8px_rgba(17,24,39,0.15)] hover:-translate-y-0.5"
                >
                  <ImageSlot className="h-[150px]" />
                  <div className="p-5 flex flex-col flex-1">
                    <div className="mb-3">
                      <CategoryPill category={article.category} />
                    </div>
                    <h3 className="text-[16.5px] leading-[1.35] font-bold mb-2">{article.title}</h3>
                    <p className="flex-1 text-[13.5px] leading-[1.6] text-gray-500 mb-3.5">
                      {article.excerpt}
                    </p>
                    <span className="text-[12.5px] text-gray-400">{article.readTime}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Video strip */}
        <section className="max-w-6xl mx-auto px-6 py-[72px]">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-[26px] font-bold tracking-[-0.02em] text-gray-900">
              Watch instead
            </h2>
            <span className="text-sm font-semibold text-blue-600">All videos →</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {VIDEOS.map((video) => (
              <div key={video.title} className="flex flex-col">
                <div className="relative h-[170px] rounded-xl border border-gray-200 bg-gray-100 flex items-center justify-center">
                  <span className="w-12 h-12 rounded-full bg-white shadow-[0_4px_12px_rgba(17,24,39,0.15)] flex items-center justify-center">
                    <Play className="w-[18px] h-[18px] text-gray-900 fill-gray-900" />
                  </span>
                  <span className="absolute right-2.5 bottom-2.5 text-[11px] font-semibold px-2 py-[3px] rounded-md bg-gray-900/80 text-white">
                    {video.duration}
                  </span>
                </div>
                <h3 className="mt-3 text-[15.5px] font-bold">{video.title}</h3>
              </div>
            ))}
          </div>
        </section>

        {/* Newsletter band — visual only for now: there is no newsletter
            backend, so the form deliberately submits nowhere. */}
        <section className="bg-gray-50 border-t border-gray-100">
          <div className="max-w-6xl mx-auto px-6 py-14 flex items-center justify-between gap-8 flex-wrap">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1.5">One useful email a month.</h3>
              <p className="text-sm text-gray-500">
                No spam, no stock tips — just what we publish, when we publish it.
              </p>
            </div>
            <form className="flex gap-2.5 flex-wrap" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="you@example.com"
                aria-label="Email address"
                className="w-[280px] max-w-full h-[46px] px-4 border border-gray-300 rounded-[10px] text-sm bg-white outline-none focus:border-gray-400"
              />
              <button
                type="submit"
                className="inline-flex items-center h-[46px] px-[22px] rounded-[10px] bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
              >
                Subscribe
              </button>
            </form>
          </div>
        </section>
      </main>

      <MarketingFooter slim />
    </div>
  )
}
