# FINtrackr — Architectural Decisions

> A snapshot of the *why* behind FINtrackr's structure. `PROJECT_STRUCTURE.md`
> tells you *where* things live; this tells you *why* they live there.
>
> Use this when you (or a new contributor) need to understand a choice before
> changing it. If a decision in here gets reversed, update this file.
>
> Each section starts with a one-line summary so you can scan. Read in full
> before challenging a pattern.

---

## State management

**TL;DR:** Local component state + custom hooks. No global store.

**Decision:** Local component state + custom hooks. No Redux, no Zustand, no Context for application state.
**Why:** At ~30 React components and one-user-at-a-time interactions, a global store would be ceremony without benefit. Hooks (`useAuth`, `useCalculatorData`, `useSave`, `useCalculatorInputs`, `useFavourites`) give us the same separation of concerns with less indirection.
**When to revisit:** If prop-drilling exceeds ~4 levels in any subtree, or if cross-cutting state (e.g. theming, feature flags) shows up. Until then, props are correct.

## Auth state via props, not Context

**TL;DR:** `useAuth` runs in `App.jsx`, `auth` is prop-drilled.

**Decision:** `useAuth` runs in `App.jsx`; the resulting `auth` object is passed as a prop wherever it's needed.
**Why:** Two consumers (`LandingPage`, `CalculatorPage`) and a small handful of leaf components. The prop trail is ≤3 levels everywhere. Context would obscure where auth comes from for ~zero ergonomic benefit at this scale.
**When to revisit:** If a fourth top-level page is added that also needs auth, or if auth-aware components proliferate. The upcoming trackers and settings page will be the test — if both end up needing auth-derived state, the trail may still be short enough for props. If it isn't, switching to Context is a 30-min refactor — no need to preempt.

## Registry-driven calculator system

**TL;DR:** One `registry.js` defines all calculator metadata. Components consume; never duplicate.

**Decision:** A single `registry.js` is the source of truth for which calculators exist, their metadata, and their lazy-loaded component reference. Backend mirrors with `VALID_CALC_TYPES` in `calc_types.py`.
**Why:** Adding a 13th calculator should be ~4 file touches max (component, registry entry, backend type, db migration). Anything more invites drift. The registry also feeds the landing-page grid, sidebar nav, the calculator page header, and the explainer banner — one source, many consumers.
**Anti-pattern guard:** Never duplicate the calculator list in another file. If a new surface needs a derived list (e.g. "all retirement calcs"), it derives from the registry inline.
**Note for next phase:** No more calculators are planned. The pattern may extend to the upcoming trackers if they share enough structure to benefit, but trackers are bigger and may justify their own registry instead of crowding this one.

## Single source of truth for calc types (backend)

**TL;DR:** `calc_types.py` is the only place `VALID_CALC_TYPES` is defined.

**Decision:** `calc_types.py` holds `VALID_CALC_TYPES`. Both `schemas/calculator_schema.py` (Marshmallow `OneOf`) and `db_init.py` (CHECK constraint) import from it.
**Why:** Previously these two lists had to be kept in sync manually. Adding a calculator would silently let invalid types into the DB or block valid ones from being saved. Now they can't diverge.
**Trade-off accepted:** `db_init.py` has a small migration block that detects when the CHECK constraint needs updating and rebuilds the table — necessary because SQLite can't ALTER a CHECK in place.

## Shared HTTP client + CSRF injection

**TL;DR:** `createApi(baseUrl)` factory in `httpClient.js`. CSRF handled centrally.

**Decision:** `httpClient.js` exports `createApi(baseUrl)` returning `{ get, post, put, delete }`. `authApi` registers a getter for the CSRF token at module load; `httpClient` calls it on every mutating request and attaches `X-CSRF-Token` automatically.
**Why:** Two API modules used to define their own near-identical `request()` function with CSRF logic copy-pasted. Easy to forget on a third module. The getter-registration pattern keeps the dependency one-way: `httpClient` knows nothing about auth state, `authApi` owns the token.
**Adding a new API namespace** is now one file with one import — see `PROJECT_STRUCTURE.md` § "Adding a New API Namespace".

## CSRF token lives in JS memory, not localStorage

**TL;DR:** Token in a module-level variable in `authApi`. Re-fetched on full reload.

**Decision:** The token is held in a module-level variable inside `authApi`. Fetched on app mount via `authApi.fetchCsrfToken()`. Cleared automatically on full page reload (re-fetched on next mount).
**Why:** Tokens in localStorage are readable by any XSS-injected script. Tokens in HttpOnly cookies are safe but require double-submit patterns. JS-memory storage is the sweet spot: no XSS exposure (a script would need to be inside `authApi`'s module scope), no cookie complexity, automatic invalidation on reload.
**Server-side detail:** `clear_session()` preserves the CSRF token across logout so the next login doesn't fail.

## CSRF on session, not cookie

**TL;DR:** Server-side session-stored token, verified via header.

**Decision:** Backend stores the CSRF token in the server-side Flask session, not in a cookie.
**Why:** With server-side sessions, the token is already protected from client tampering — no need for double-submit cookie patterns. The header-based scheme (`X-CSRF-Token`) is the simpler half of double-submit.

## No ORM — raw SQL via sqlite3

**TL;DR:** Raw `sqlite3` with parameterised queries. SQLAlchemy is not coming.

**Decision:** All DB access uses `sqlite3` directly with parameterised queries.
**Why:** Two tables, ~10 queries total at MVP. SQLAlchemy would mean a week of refactor for zero correctness or performance gain. Raw SQL is also more transparent about what's actually hitting the database.
**Safety:** Every query against `saved_calculators` includes `AND user_id = ?` — IDOR protection enforced at the query layer, not at a permission layer.
**Stress-test for next phase:** The trackers will add at least two new user-scoped tables (entries, optionally categories). Same rule applies — no query without the user_id filter. If the table count climbs past 6–8, the no-ORM call should be revisited.

## Filesystem sessions in dev

**TL;DR:** `flask-session` filesystem backend in dev. Redis before going multi-worker.

**Decision:** `flask-session` with filesystem backend in development.
**Why:** Zero infrastructure to run. Works out of the box on a fresh checkout.
**When to revisit:** Before multi-worker production deployment. Filesystem sessions don't survive across worker processes — swap to Redis (`SESSION_TYPE = redis`) before going to gunicorn with `-w 2+`.

## Number formatting via shared `fmt()`

**TL;DR:** One `fmt()` in `utils/format.js`. No local copies, ever.

**Decision:** One `fmt()` in `utils/format.js`. Every calculator imports it. No local `fmt()` definitions allowed.
**Why:** Twelve calculators had near-identical local `fmt()` functions before extraction — small variations meant `$1.5K` here and `$1,500` there. Centralising fixes the inconsistency and gives us a single place to add features (currency override, decimal-place override).
**Next phase consideration:** The upcoming i18n / language setting will likely interact with `fmt()` (localised currency symbols, decimal/thousand separators). When that lands, extend `fmt()` — don't add a parallel formatter.

## Calculator input state via `useCalculatorInputs`

**TL;DR:** One hook owns input state, sync, change-notification, and version injection.

**Decision:** A hook that owns `useState`, the `initialData` sync effect, the `onDataChange` notification effect, and a `set(field)` curry. Returns `{ inputs, set, setInputs }`.
**Why:** All twelve calculators had the same 4-line boilerplate. Now they have one hook call. Adding a 13th calculator means writing inputs + render — no plumbing.
**Exception:** `SankeyDiagram` has two state slices (income sources, expense groups), so it calls `migrate()` and `stripVersion()` directly instead. The exception is documented in code. See § "Sankey v2 — nested groups, restyle, permalink" for the full shape.

## Saved-data versioning

**TL;DR:** Every saved shape has a `version` field. Migrations live in `migrateCalcData.js`. `__v` is internal — stripped before save.

**Decision:** Every calculator's `DEFAULTS` includes `version: 1` as the first field. `migrateCalcData.js` holds a per-type migration registry. The internal `__v` key is stripped before save and re-injected on load.
**Why:** Saved data is opaque JSON in SQLite. Without a versioning system, renaming a field or changing units would silently break every existing saved record. Now we have a controlled upgrade path: bump the version, register a migration, old records upgrade on load.
**Why strip the key before save:** Stored JSON stays clean — `__v` is metadata, not user input. Re-injection happens on load via `injectVersion()` (defaults to 1 for legacy records that pre-date versioning).
**First real migration:** Sankey is the first calculator to advance past `version: 1` — its v1→v2 migration (flat `expense_categories[]` → nested `expense_groups[]`) is the proof that the versioning system works end-to-end on real saved data. See § "Sankey v2".
**Next phase rule:** The tracker features will store their own user data. Same versioning rule applies — no shape without a `version: 1` field and a stub migration entry.

## Calculator explainers driven by registry

**TL;DR:** Registry holds `{ heading, body }`. One `<CalculatorExplainer>` renders it. Calculators must not render their own.

**Decision:** Each registry entry has `explainer: { heading, body }`. A single `<CalculatorExplainer>` component renders the gradient banner above the Suspense boundary in `CalculatorPage`. Calculator components do not render their own explainer.
**Why:** Originally only BaristaFIRE had an inline explainer. Extending the pattern would have meant 11 copies of nearly-identical JSX, plus a maintenance burden on the structure. Now adding an explainer to a new calculator means writing two strings in the registry — and the banner appears for free, including during the lazy-load skeleton (a nice side effect).

## Sankey v2 — nested groups, restyle, permalink

**TL;DR:** Sankey is a 4-column diagram (income → Budget hub → group → subcategory) with its own nested data shape, a soft pastel restyle, currency picker, %/amount toggle, and a client-side permalink.

**Decision:** Sankey diverges from the other 11 calculators in four ways:
1. **Nested data shape (v2).** `{ income_sources[], expense_groups[] }` where each group has `items[]`. This is the only calculator whose saved shape isn't a flat input map.
2. **Four-column diagram.** income source → `Budget` hub → expense group → subcategory. Mirrors the structure of a real budget (group totals roll up from their items).
3. **Toolbar controls.** A currency picker (`$ / € / £`), an amount/% toggle (% = share of total income), and a "Copy permalink" button.
4. **Permalink via URL state.** Full diagram state is encoded as `?data=<base64>` — no backend, no DB column. On mount, a `?data=` param takes precedence over `initialData`. The button writes the URL to the clipboard and the address bar via `history.replaceState`.

**Why nested groups:** The original flat `expense_categories[]` couldn't express "Housing = Rent + Electricity". A real budget groups spending, and the diagram is far more legible with a middle layer. Cost: a breaking data-shape change, handled by a v1→v2 migration (flat list wrapped into a single "Expenses" group — non-destructive, idempotent).

**Why permalink is client-side, not backed by the DB:** A shareable budget snapshot doesn't need to be a persisted record — it's a point-in-time view someone pastes into a chat or bookmark. URL state is zero-infra and the link works for logged-out users. If we later want named, editable shared budgets, that becomes a backend feature (`?id=` + a public-share endpoint) — but that's a different product decision, not a prerequisite.

**Why the restyle is Sankey-only:** The pastel palette, inline band labels, and dark hub bar were tuned for flow legibility — they're not the app's global design language (that refresh is still pending; see § "Design system extraction"). Sankey got the treatment first because it was the calculator whose old styling read as most broken (saturated colours, colliding labels, 1px stub bands from the old `Math.max(1, value)` hack).

**Layout-bug fixes that shipped with the rebuild:** label truncation with ellipsis (names no longer overflow the box); sub-threshold entries (`< 1`) filtered from the diagram but kept editable in inputs (no more 1px stub bands); thin middle bands skip their label to avoid collisions; endpoints always labelled.

**When to revisit:** If a second tracker/calculator needs nested groups, consider whether the group/item editor UI is worth extracting into a shared primitive. For now it lives in `SankeyDiagram.jsx` — one consumer, no extraction.

## Lazy-loaded calculators with skeleton fallback

**TL;DR:** All calculator components are `lazy()`-imported. `<Suspense>` + `CalculatorSkeleton`.

**Decision:** Every calculator component is `lazy()`-imported in `registry.js`. `CalculatorPage` wraps the render in `<Suspense>` with `CalculatorSkeleton` as fallback.
**Why:** First-page-paint shouldn't pay for code the user hasn't navigated to. The 12 calculators include Recharts and d3 in some bundles — non-trivial weight. Lazy loading defers those costs until the user actually visits each calc.
**Why a skeleton:** The chunk fetch is ~50–200ms on a typical connection. A skeleton during that interval signals progress; a flash of nothing feels broken.

## Login/Register pages as thin wrappers around `<AuthForm>`

**TL;DR:** One form shell, two pages. They differ only in copy and submit handler.

**Decision:** Both pages share a single form shell. They differ only in badge, copy, button labels, and submit handler.
**Why:** They were ~95% identical before extraction. Two files, same maintenance burden when fixing a styling bug or adjusting validation rendering.

## `<UserFooter>` shared across LandingPage + CalculatorSidebar

**TL;DR:** One component, two variants (`compact`, `roomy`). Owns the delete-modal state internally.

**Decision:** The authenticated-user footer block (email, sign-out, delete account modal) is one component with two variants (`compact`, `roomy`). Owns the delete-confirmation modal state internally.
**Why:** The block was duplicated, *and* both parents owned their own copy of the delete-modal state with identical handlers. Extraction collapsed both. The variants exist because the surrounding contexts have slightly different visual weight.
**Why unauthenticated CTAs are NOT shared:** LandingPage shows two buttons (Sign in + Create account, the latter as an amber CTA). CalculatorSidebar shows a single muted "Sign in to save" link. Different surfaces, different intent — sharing would force a worse compromise on both.

## Save logic in `useSave` with `activeSavedCalcId` reset on type change

**TL;DR:** `useSave` owns all save state. Resets on type change to prevent cross-calc leak.

**Decision:** All save state and handlers live in `useSave`. When the URL `type` param changes, `activeSavedCalcId` resets to `null`.
**Why for the hook:** Save state (`activeSavedCalcId`, `saveStatus`, `saveError`, modal open) is a coherent unit. Keeping it in one place means `CalculatorPage` orchestrates without owning the mechanics.
**Why the reset:** `CalculatorPage` doesn't unmount when you click a different calculator in the sidebar — only the `type` param changes. Without the reset, a saved-record ID from FIRE would leak into Mortgage and the save button would mis-render as "Update" on a different calculator entirely. (This was a real bug; the reset is the fix.)

## "New" button + sidebar click-to-deselect

**TL;DR:** Two ways to detach from an active record without resetting inputs.

**Decision:** Two ways to detach from an active saved record without losing inputs: (a) the "New" button in the header, visible only when a record is loaded; (b) clicking the active record in the saved sidebar.
**Why two:** Discoverability + ergonomics. The button is the obvious affordance; the sidebar click-to-deselect is faster for users who already understand the saved list. Power users get the shortcut; new users see the button.
**Why don't reset inputs:** The common workflow is "I just saved 'Conservative FIRE'; let me tweak and save 'Aggressive FIRE'." Resetting to DEFAULTS would force re-entering nearly the same values.

## Favourites in localStorage, not in the DB

**TL;DR:** Per-user favourites stored locally. Don't sync across devices. Acceptable for MVP.

**Decision:** Per-user favourites stored in `localStorage` keyed by `fintrackr_favourites_${user.id}`.
**Why:** Favourites are a UX preference, not user data. They don't need to survive across devices, don't need backups, don't need ACID. Adding a `favourites` table would mean a migration, a new endpoint, a new query — all for a star button.
**Trade-off accepted:** Favourites don't sync across devices. Acceptable for an MVP. If users complain, this becomes one of the first features to move server-side.

## CalculatorPage as orchestrator only

**TL;DR:** Routing guards + data fetching + sidebar state. Header / skeleton / explainer / save extracted.

**Decision:** `CalculatorPage` does routing guards, data fetching, save coordination, and sidebar state. The header, skeleton, explainer, save flow, and inputs are all separate components/hooks.
**Why:** Originally `CalculatorPage` was ~230 lines mixing all of this. Now it's ~120 and reads as a top-down summary of the page. Each extracted piece has one job.

## Rate limiting via Flask-Limiter with per-route configuration

**TL;DR:** Tight limits on auth, looser on data. Memory in dev, Redis in prod.

**Decision:** Limiter instance lives in `app.py`. Routes import it and apply `@limiter.limit()` per endpoint. Auth routes get tighter limits than data routes.
**Why:** Brute-force auth is the main attack vector. Login gets 5/min + 20/hr; register gets 10/hr; account deletion gets 5/hr. Data routes are looser.
**Storage:** `memory://` in dev. Swap to Redis (`RATELIMIT_STORAGE_URI=redis://...`) before going multi-process or limits won't actually limit.

## bcrypt + 8-char password rule

**TL;DR:** bcrypt + 8 chars with letter + number. Reasonable floor without being onerous.

**Decision:** bcrypt for hashing, Marshmallow schema enforces 8+ chars with at least 1 letter and 1 number.
**Why bcrypt:** Battle-tested, adaptive cost factor, no foot-guns.
**Why the password rule:** Reasonable floor without being onerous. Long enough to defeat trivial brute-forcing combined with rate limiting; lax enough that a real human can remember their password.

## Account deletion requires password re-confirmation

**TL;DR:** `DELETE /api/auth/account` checks the password. Cascades via `ON DELETE CASCADE`.

**Decision:** `DELETE /api/auth/account` rejects the request unless the request body contains the user's current password (verified via bcrypt). Cascades via `ON DELETE CASCADE` on `saved_calculators`.
**Why:** Hijacked session shouldn't be able to nuke the account silently. Requiring the password means an attacker would also need the credentials — at which point they could log into a fresh session anyway, but the friction stops casual session-hijack scenarios.
**Next phase note:** The new tracker tables will need `ON DELETE CASCADE` to `users` for the same reason.

## Security headers via Flask-Talisman

**TL;DR:** HTTPS in prod, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, strict `Referrer-Policy`.

**Decision:** Talisman enabled in `app.py`. Forces HTTPS in production, sets `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and a strict `Referrer-Policy`.
**Why:** Defence in depth. Each header blocks a specific attack class — clickjacking, MIME confusion, referrer leakage. Cheap to add, hard to remember to add later.

## Config from `.env`, app exits on missing/invalid secret

**TL;DR:** Loud failure beats silent fragility.

**Decision:** All sensitive values in `.env`. `config.py` reads them via `python-dotenv`. App exits at startup if `FLASK_SECRET_KEY` is missing, under 32 chars, or still the placeholder.
**Why:** Loud failure beats silent fragility. A misconfigured production server should refuse to boot rather than run with a weak key.

---

## Decisions deliberately NOT made (and why)

These come up in conversations as "should we add this?" — the answers below are durable until something changes:

- **TypeScript** — highest single-refactor ROI available, but ~1–2 days of work. Defer until before the trackers ship or before adding another dev.
- **Card-shell extraction** (a `<Card>` primitive for the white shadow boxes) — saves ~24 lines across 12 files. Thin abstraction, weak win. Skip — *unless* the design refresh introduces enough card variants to justify it.
- **`<InsightCard>` extraction** for the per-calculator "Insight" footer blocks — the content varies wildly; extracting the shell obscures meaningful copy. Skip.
- **SQLAlchemy** — see § "No ORM."
- **A backend calculator engine** — calculations on the frontend means free, no roundtrip, instant feedback. Don't move them.
- **Server-side favourites** — see § "Favourites in localStorage."

---

## Decisions still to make (the next phase)

These are explicitly open and need to be settled before or during the work that triggers them. Each one will become its own section above once decided.

### How tier / entitlement state lives

**The question:** When the freemium model lands, every gated feature needs to ask "what tier is the user on?" The cheapest answer is `auth.tier` (added to the user record, read off the existing prop-drilled `auth` object). The more sophisticated answer is a dedicated `useEntitlements` hook with cached server checks and feature-flag semantics.
**Default until decided:** Add `tier` to the user record, expose it on `auth`. Promote to a dedicated hook only if (a) we add more than ~3 gated features, or (b) entitlements ever need to be checked against more than the user's stored tier (e.g. trial expiry dates, grandfathered users).
**What forces the decision:** The first paid feature shipping. Don't pre-build the hook.

### Three-layer entitlement enforcement

**The question:** Gating a paid feature at the UI alone is a bug — a curl request can bypass it. Where the checks live needs to be conventional, not ad-hoc per feature.
**Likely answer:** A small `@requires_tier('paid')` decorator on the route side (analogous to `@login_required` and `@csrf_protect`), an `<EntitlementGate tier="paid">` component on the UI side, and the `AND user_id = ?` rule already handles the DB side because tier-gated features will live in tier-specific tables or tier-gated rows.
**Decide before:** Net worth tracker ships, since net worth is the first feature with a paid-tier slice.

### Tracker architecture — reuse calculator patterns, or new pattern?

**The question:** Trackers have lists, history, and time-series. Calculators have a single input set. Whether trackers ride on the calculator registry / save flow, or sit on their own pattern, is open.
**Initial leaning:** Shared primitives (NumInput, StatCard, the save flow's *shape* via versioning + IDOR), but distinct page-level orchestration and likely a distinct sidebar section. Probably their own registry if they share enough structure with each other.
**Decide before:** Writing the second tracker. The first tracker will accidentally define the pattern; the second is where you find out whether the accident was a good one.

### Landing page — same Vite app, or separate?

**The question:** A marketing landing page has different SEO, perf, and design priorities than the app. One Vite project with a marketing route is the cheap answer; a separate Astro / Next static site is the higher-quality answer.
**Initial leaning:** Same Vite app, marketing route at `/`, app at `/app`. Reassess if the marketing page wants real CMS or real SEO complexity.

### i18n — when, how, and how deeply

**The question:** Language as a user setting means at minimum a translation table for all UI strings. At maximum, it means localised currency formatting, dates, and number conventions throughout.
**Initial leaning:** Use `react-i18next` for strings; extend `fmt()` for currency/number locale. Tackle as part of the design refresh, not as a separate pass.

### Design system extraction

**The question:** The visual refresh will touch every component. Whether to extract a `<Card>`, `<Button`, `<Section>` primitive layer first, or refresh in place, is open.
**Initial leaning:** Refresh in place for two or three components first to see what the new visual language actually looks like, *then* extract primitives once the patterns are visible. Premature abstraction here is worse than duplication.
