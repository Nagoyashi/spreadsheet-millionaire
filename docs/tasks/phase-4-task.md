# Phase 4 — Mobile usability patch + tracker teasers

Read `CLAUDE.md`, `PROJECT_STRUCTURE.md`, and `DECISIONS.md` in full before touching anything. Then present your plan (files changed, files added, destination paths) and wait for my approval before writing code.

## Context

Staging is live at spreadsheetmillionaire.com. Two confirmed mobile problems from real-device testing:

- **UX-1**: on the in-app landing/front page, the sidebar is not collapsible on mobile — it eats the viewport.
- **UX-2**: globally on phones, text is too small and layouts are cramped/messy. The app technically responds to width but was never *designed* at 375px.

This is a **usability patch, not the design refresh**. The visual language (dark stone-950 theme, DM fonts, amber accents, current components) stays exactly as it is. You are adjusting sizes, spacing, stacking, touch targets, and overflow — nothing else. The full redesign is a later, separate project that follows the marketing landing page's new visual language.

Second deliverable: build-in-public teasers for the two upcoming trackers (Net Worth, Income/Expenses) — sidebar entries + a coming-soon page.

Note: `frontend/index.html` already has a correct viewport meta tag (verified) — don't chase that; the sizing problems are real CSS.

## Part 0 — Preconditions

1. Clean tree, on `develop`, Phase 3 merged (`frontend/vercel.json` exists). If not, stop.
2. Create the working branch: `feature/mobile-usability-and-teasers` off `develop`.

## Part 1 — Audit before editing

Read these components and map every fixed width, small font, tight grid, and hover-only affordance, at a target viewport of 375×667 (shared components first, since fixes there cascade):

- `pages/LandingPage.jsx` (the in-app grid — where UX-1 lives), `pages/CalculatorPage.jsx`
- `components/CalculatorSidebar.jsx`, `components/CalculatorHeader.jsx` (it already has some mobile-menu concept — understand it before adding another)
- `components/ui/StatCard.jsx`, `components/ui/NumInput.jsx`, `components/ui/ChartTooltip.jsx`, `components/AuthForm.jsx`, `components/UserFooter.jsx`
- The four **published** calculators only: FIRE, Compound Interest, Emergency Fund, Debt Payoff

Output the audit as a short list in your plan: component → problem → intended fix. No code yet.

## Part 2 — UX-1: sidebar behavior on mobile

Whatever surface shows a non-collapsing sidebar at phone width gets the standard pattern: hidden by default below the `lg` breakpoint, opened via a hamburger button, rendered as an overlay/drawer with a backdrop, closed by backdrop tap / close button / route navigation. If `CalculatorHeader`'s existing mobile-menu mechanism already does most of this for calculator pages, extend that one pattern to the front page rather than inventing a second mechanism — one drawer pattern for the whole app.

## Part 3 — UX-2: the global sizing pass

Apply consistently, using Tailwind responsive prefixes (mobile-first: base classes are the phone, `sm:`/`lg:` restore the current desktop look — the desktop result must be visually unchanged):

1. **Text floors**: no body text below `text-sm` on mobile; primary stat values readable without zooming (the current `text-4xl` StatCard values may *shrink* on mobile if they overflow — readable beats huge); labels ≥ `text-xs` only for true captions.
2. **Touch targets**: interactive elements ≥ 44px effective hit area on mobile — buttons, the favourite star, sidebar rows, the save button, `NumInput` steppers if any. Padding, not font size, is usually the lever.
3. **Stacking**: multi-column grids collapse to one column at base width (`grid-cols-1 sm:grid-cols-2 ...`); side-by-side input/chart layouts stack with inputs first.
4. **Overflow**: no horizontal page scroll at 375px, ever. Charts live in responsive containers; wide tables get `overflow-x-auto` on the table only.
5. **Inputs**: numeric fields get `inputMode="decimal"` (or `numeric`) so phones show the number pad; font-size of inputs ≥ 16px on mobile to stop iOS auto-zoom on focus.
6. **Hover-only affordances**: anything revealed on hover (e.g. delete ✕ on rows) must be visible or reachable on touch.

Hard scope limits: do NOT restyle, recolor, or restructure components; do NOT touch the 8 unpublished calculator components directly (they inherit shared-component fixes for free, which is fine); do NOT introduce a CSS framework, component library, or design tokens.

## Part 4 — Tracker teasers

1. One definition, one place: a small `UPCOMING_FEATURES` array (slug, label, Icon, blurb, ETA-ish copy like "In development") in its own module under `frontend/src/`. It does NOT go into the calculator registry — trackers aren't calculators, and the registry's consumers (save flow, explainers, backend types) must not see them. Document the separation.
2. `pages/ComingSoonPage.jsx` at route `/coming-soon/:slug`: looks up the slug in `UPCOMING_FEATURES`, unknown slug redirects like unknown calculator types do. Content: icon, label, one-paragraph blurb, "We're building in public — this is coming soon", a button back to the calculators. Match the existing visual language; no email-capture form (no backend in this phase).
3. Sidebar: a new "Coming soon" section in `CalculatorSidebar` listing the two entries with a subtle badge, linking to their pages. Visually distinct enough that nobody mistakes them for working features.
4. In-app `LandingPage` grid: one teaser card per upcoming feature, after the calculator cards, clearly badged, linking to the coming-soon page.

## Part 5 — Documentation (same PR)

1. `PROJECT_STRUCTURE.md`: new files (`ComingSoonPage.jsx`, the upcoming-features module), the sidebar/landing additions, a line in conventions about the mobile-first floors (text-sm body floor, 44px touch targets, 16px inputs) so future components comply.
2. `DECISIONS.md`, house format: **"Tracker teasers outside the calculator registry"** — why the registry stays calculators-only, and that the real tracker architecture decision (own registry vs ad-hoc) remains open per the existing "Decisions still to make" section.

## Part 6 — Verification & PR

1. `npm run build` passes; `git diff develop... --name-only` shows zero `backend/` changes.
2. Self-check each edited component's JSX against the Part 3 rules — list them in the PR description as a table: component → what changed.
3. The PR description ends with a **human device checklist** (I'll run it on a real phone): front page sidebar opens/closes via hamburger; no horizontal scroll on any published calculator at 375px; numeric keypad appears on number inputs; no zoom-on-focus; stat values readable; favourite star tappable; coming-soon pages reachable from sidebar and grid; desktop view unchanged.
4. Conventional commits, e.g. `fix: collapsible sidebar drawer on mobile`, `fix: mobile sizing and touch-target pass on published calculators`, `feat: coming-soon teasers for net worth and income/expense trackers`, `docs: record teaser pattern and mobile floors`.
5. Push, `gh pr create` into `develop`, do not merge.

## Guardrails

- This is not the redesign. Desktop appearance unchanged; mobile changes are size/spacing/behavior only.
- No new dependencies. No Context, no global state — the drawer's open/close is local state.
- The calculator registry is not touched except where the sidebar/landing consume it; `published` semantics unchanged; backend untouched.
- If a fix genuinely requires restructuring a component, stop and ask first.
