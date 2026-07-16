// Shared hero pattern for the marketing section pages (Guide / Comparison /
// ETFs & Stocks), per the design handoff: amber eyebrow (12px caps) → 44px H1 →
// gray sub (17px, max-w 580px), centered, 72px top padding. Page-specific
// content (search inputs, chips, pills) renders below via children.
export default function MarketingPageHero({ eyebrow, title, sub, children }) {
  return (
    <section className="max-w-6xl mx-auto px-6 pt-[72px] text-center">
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-amber-600 mb-3">{eyebrow}</p>
      <h1 className="mx-auto max-w-[680px] text-4xl sm:text-[44px] leading-[1.1] font-bold tracking-[-0.025em] text-gray-900 [text-wrap:balance]">
        {title}
      </h1>
      <p className="mt-[18px] mx-auto max-w-[580px] text-[17px] leading-[1.65] text-gray-600">
        {sub}
      </p>
      {children}
    </section>
  )
}
