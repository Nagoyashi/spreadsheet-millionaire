# Phase 6 — Marketing landing page, /app route restructure, legal pages

Read `CLAUDE.md`, `PROJECT_STRUCTURE.md`, and `DECISIONS.md` in full before touching anything. Then present your plan (files changed, files added, destination paths) and wait for my approval before writing code.

## Context

The domain currently drops visitors straight into the in-app calculator grid. This phase gives SpreadsheetMillionaire a public face: a minimalist fintech-SaaS marketing page at `/`, the app relocated under `/app/*`, and the legal pages a public product needs. `DECISIONS.md` already leans "same Vite app, marketing route at `/`" — this phase makes that decision final; record it.

This is also the phase that **defines the product's public visual language** — the later app design refresh will inherit from what you build here. Take the design seriously.

Zero backend changes. If you touch `backend/`, stop.

## Part 0 — Preconditions

1. Clean tree, on `develop`, Phase 5 merged (`pages/SettingsPage.jsx` exists). If not, stop.
2. Working branch: `feature/marketing-landing` off `develop`.

## Part 1 — Route restructure

New map (update `App.jsx`):

- `/` → marketing landing (new)
- `/privacy`, `/terms` → legal pages (new)
- `/app` → the in-app landing (currently `/`)
- `/app/calculator/:type` → calculator page (currently `/calculator/:type`)
- `/app/coming-soon/:slug` → coming-soon page
- `/app/settings` → settings page
- `/login`, `/register`, `/forgot-password`, `/reset-password/:token` → unchanged at top level (they're shared doors between marketing and app)

Requirements:

1. **Redirects from every old path** via `<Navigate>` so existing links and the staging users' bookmarks survive: `/calculator/:type` → `/app/calculator/:type`, old `/settings` and `/coming-soon/:slug` likewise. Param-preserving.
2. **The auth return-to flow must survive.** The login/register pages carry return-to redirect logic with sessionStorage persistence of calculator inputs across the auth round-trip — read it, update every hardcoded path it knows about, and verify the "start on a calculator → sign in → land back with inputs intact" flow against the new paths.
3. A logged-in visitor to `/` sees the marketing page (no auto-redirect into the app); the marketing nav adapts: "Open app" when authenticated, "Sign in" + "Get started" when not. `auth` arrives as a prop from `App.jsx`, per convention.
4. Internal links sweep: sidebar, footer, logo click-targets, post-login/post-register destinations, the coming-soon back-button — grep for every hardcoded route string and update.

## Part 2 — Marketing page structure

New folder `frontend/src/marketing/` (parallel to `calculators/`):

- `MarketingNav.jsx` — logo, links (Calculators → `/app`, GitHub, Sign in / Open app). Mobile: collapses per the Phase 4 drawer pattern or a simple menu.
- `Hero.jsx` — one strong headline about the actual value (path to financial independence, free planning calculators), one subline, primary CTA "Try the calculators — free, no signup" → `/app`, secondary "Create an account" → `/register`. No carousel, no video, no clutter.
- `CalculatorShowcase.jsx` — one card per **published** calculator, driven by `PUBLISHED_CALCULATORS` from the registry (label, subtitle, gradient, Icon — all already there; derive, never duplicate). Cards link to the calculator directly: usable without signup is the product's superpower; the landing page should prove it in one click.
- `ComingSoonStrip.jsx` — the trackers, driven by `UPCOMING_FEATURES`, framed as "built in public" with a link to the GitHub repo (it's genuinely public — that's authentic credibility).
- `ValueProps.jsx` — three or four short points: free, no signup required to calculate, save with an account, privacy-respecting (no ads, no data selling — these are true; see Part 4).
- `MarketingFooter.jsx` — privacy, terms, GitHub, © line.
- `pages/MarketingLandingPage.jsx` composing the above.

**Authenticity rule, non-negotiable: invent nothing.** No fake testimonials, no fabricated user counts, no "as seen in" logos, no stock-photo people. Everything on the page must be true of the product today. "Free while in beta" is honest framing for the missing pricing story; a `/pricing` page waits until the paid tier actually exists.

## Part 3 — Design direction

Minimalist fintech SaaS. Keep the product's identity — dark `stone-950` base, amber accent, DM font family — so the app doesn't feel like a different product when users click through. Within that: generous whitespace, a large confident type scale in the hero, subtle borders over heavy shadows, one accent color doing all the accent work, restrained motion (CSS transitions only — no animation libraries). The registry's `gradient` fields give the showcase cards their color variety; the rest of the page stays calm so they pop.

Mobile-first, and the Phase 4 floors apply: body ≥ `text-sm`, 44px touch targets, no horizontal scroll at 375px. The hero must look intentional on a phone, not like a shrunk desktop.

SEO within SPA limits: a proper `<title>` and meta description + OG tags in `index.html` for the landing; a small `useDocumentTitle` hook giving each route a distinct title (`FIRE Calculator — SpreadsheetMillionaire` etc.). No SSR, no prerender, no react-helmet — accept and record the SPA SEO limitation in `DECISIONS.md` with a revisit trigger (if organic search becomes a real channel, the marketing page moves to a static generator).

## Part 4 — Legal pages

`pages/PrivacyPage.jsx` and `pages/TermsPage.jsx` on a shared minimal prose layout (`LegalLayout`), linked from the footer.

Write the privacy policy against the **actual** data practices — read the code, don't template blindly: account data is email + bcrypt password hash; saved calculator inputs stored per-user (Neon/Postgres); session cookie (essential-only — no analytics or tracking cookies exist, so no cookie banner is needed; say so); Redis session storage; transactional email via Resend (welcome + password reset only, no marketing email); no ads, no selling of data; user rights: account + data deletion is self-service (the delete-account flow), data correction via settings. Include a contact email placeholder for me to fill. GDPR-aware tone since the audience includes the EU.

Terms: standard boilerplate — service provided as-is, **calculators are educational tools, not financial advice** (this disclaimer also gets one quiet line in the marketing footer), acceptable use, account termination, liability limits, governing-law placeholder.

Both pages open with an HTML comment and a PR note: **generated boilerplate, requires human review; not legal advice.**

## Part 5 — Documentation (same PR)

1. `PROJECT_STRUCTURE.md`: the `marketing/` tree, new pages, the full new route map (it's the third file people will check; make the table complete).
2. `DECISIONS.md`: promote "Landing page — same Vite app" from *Decisions still to make* to a decided section (why: one deploy, shared auth/session, shared design tokens; revisit: CMS/SEO needs). New short sections: "SPA SEO limitation accepted" and "Marketing page invents nothing" (the authenticity rule as a standing constraint).

## Part 6 — Verification & PR

1. `npm run build` passes; `git diff develop... --name-only | grep ^backend/` is empty.
2. Route matrix in the PR description: every new route, every redirect, each verified by hard refresh (the Vercel SPA fallback must serve all of them).
3. The auth round-trip check from Part 1.2, stated explicitly as performed.
4. Conventional commits per part: `feat: restructure routes under /app with redirects`, `feat: marketing landing page`, `feat: privacy and terms pages`, `docs: ...`.
5. Push, `gh pr create` into `develop`. The PR will get an automatic **Vercel preview URL** — surface it prominently in the description; the human reviews the design on a real phone from that link before any merge. Do not merge.

## Guardrails

- Zero backend changes. Zero calculator-component changes. Registry consumed, never modified.
- No new dependencies — no helmet, no framer-motion, no icon packs beyond lucide-react.
- `PUBLISHED_CALCULATORS` and `UPCOMING_FEATURES` are derived sources; duplicating either list anywhere on the marketing page is a bug.
- Nothing fabricated: no testimonials, counts, logos, or claims that aren't true today.
- If the return-to auth flow can't survive the restructure without deeper changes, stop and ask.
