# project.md — spreadsheetmillionaire.com

> Canonical roadmap & strategy. This file owns the **plan** at phase level; the
> GitHub Project board ("spreadsheetmillionaire.com") owns **execution** at task
> level. They never track the same thing — this file records phase-level status
> only and links to the board for per-task state. Rationale for *how* things are
> built lives in `DECISIONS.md`; this file links to it rather than repeating it.
> The **open Milestone** owns live cycle scope/progress; this file owns the
> phase-level *plan* and the durable log. The board owns per-task status.

## Vision

A free, transparent, build-in-public personal-finance toolkit: calculators
anyone can use without an account (with optional save/load for signed-in users),
expanding from calculators into trackers and a freemium tier.

## Current phase

**Phase 14 — Go-live readiness + instrumentation is COMPLETE** — shipped as
three sub-releases: **`v0.14.0`** observability + analytics (2026-07-11:
Sentry, structured logging, readiness probe, PostHog funnel — all
credential-gated), **`v0.14.1`** data lifecycle + legal (2026-07-12: verified
deletion cascade, data export, legal pages current, admin support tools), and
**`v0.14.2`** CI confidence + scale sanity (2026-07-12: CI can't go green
without the DB, migration/entitlement/cascade/rate-limit tests, Neon pooling
check — suite 132→147).

**Phase 15 — I&E bulk data entry is COMPLETE** (2026-07-14, one-day cycle): the
**Monthly entry** grid on the Income & Expense tracker — pick a month, fill each
category's sum, save once — built on aggregate `source='monthly'` transaction
rows so the Overview needed no second aggregation path. Also resequenced the
roadmap: **Billing slides to Phase 16 (`v0.16.0`)** and absorbs the free/premium
boundary decision from the former trackers-go-live phase (see
`docs/ROADMAP.md`). Next up: **Phase 16 — Billing**, the keystone; its epic
tickets are pre-filed (#189–#197), not yet promoted to a milestone.

## Current cycle

> Canonical cycle state = the single **open GitHub Milestone**. This line mirrors
> it for at-a-glance reading in the editor; if they disagree, the milestone wins.

**Between cycles — Phase 15 shipped** (`v0.15.0` tagged 2026-07-14, milestone
closed; same-day patch `v0.15.1` — custom categories, grid color coding, bulk
teaser, year-selector fix — follows the patch ritual). **Next up: Phase 16 —
Billing (`v0.16.0`)**, pre-filed as #189–#197 plus the free/premium boundary
decision (see `docs/ROADMAP.md` § Phase 16); not yet opened as a milestone.
Operator to-dos still pending from Phase 14: Sentry + PostHog keys, external
uptime monitor on `/api/health/ready`, `pooling_check.py` against the real
Neon strings. Backlog on the
[Project board](https://github.com/users/Nagoyashi/projects) ↗

Each release cycle is a Milestone named for its target version (`v0.10.0`); its
issues are the cycle's scope. Patches (`vX.Y.Z`, Z > 0) skip milestones.

## Roadmap

### ✅ Shipped

| Phase | Shipped | Summary |
|-------|---------|---------|
| **Prototype** | `v0.1.0-prototype` · 2026-06-09 | Initial Flask + React/Vite build: 12 calculators, auth, save/load, the calculator registry, Sankey v2. |
| **Phase 1 — Rename + MVP narrowing** | 2026-06-11 | Became *SpreadsheetMillionaire*; `published` flag narrows the public app to 4 calculators. |
| **Phase 2 — Managed backend** | 2026-06-12 | Postgres (Neon), Redis (Upstash), Resend email; off SQLite. |
| **Phase 3 — Staging deploy** | 2026-06-12 | gunicorn + ProxyFix, `/api/health`, Vercel single-origin proxy, runbook. |
| **Phase 4 — Mobile usability + tracker teasers** | 2026-06-12 | Mobile-first pass; Net Worth / Income-Expense teasers. |
| **Phase 5 — Password reset + settings** | 2026-06-12 | Hashed single-use reset tokens; `/settings`. |
| **Phase 6 — Marketing landing + `/app` restructure + legal** | `v0.6.0` · 2026-06-13 | First production release. |
| **Phase 7 — Numeric input hardening** | `v0.7.0` · 2026-06-13 | Bounded/clamped inputs; `fmt()` ceiling; `finiteOr`. |
| **Phase 8 — Launch** | `v0.8.0` · 2026-06-14 | Two-environment cutover: env-driven `BACKEND_ORIGIN` proxy (edge middleware); prod on `main` + Neon production branch; staging service on `develop`. |
| **Phase 9 — Test & CI foundation** | `v0.9.0` · 2026-06-20 | pytest + vitest harnesses; auth/IDOR/migration coverage; ESLint + Prettier; CI gate with a Postgres service. → [v0.9.0](docs/releases/v0.9.0.md) |
| **Phase 10 — Net Worth Tracker** | `v0.10.0` · 2026-06-21 | First tracker: 5 normalised `nw_*` tables, `/api/net-worth/*` (CRUD + summary + snapshots), tabbed Wealth page + category CRUD + recharts dashboard; ships dark behind `NET_WORTH_ENABLED`. → [v0.10.0](docs/releases/v0.10.0.md) |
| **Phase 11 — Income & Expense Tracker** | `v0.11.0` · 2026-06-21 | Second tracker: `ie_transactions` + `/api/income-expense/*` (CRUD + monthly/yearly summary), transactions panel + recharts cashflow dashboard; ships dark behind `INCOME_EXPENSE_ENABLED`. No shared tracker framework. → [v0.11.0](docs/releases/v0.11.0.md) |
| **Phase 12 — Admin Control Center** | `v0.12.0` · 2026-06-28 | Internal admin-only `/admin` portal (`users.is_admin`, 404 for non-admins): Overview with **live publish toggles** (publish state moved to a DB-backed `calculator_publish` table the public app reads at runtime), Users (tier `free`/`pro`/`elite` + suspend/reinstate + `admin_audit_log`), Analytics (GA4 server-side proxy + DB-signup empty state). Also: migrate-on-boot (gunicorn `on_starting`) + sidebar brand-link fix. → [v0.12.0](docs/releases/v0.12.0.md) |
| **Phase 13 — Backlog cleanup + Security hardening** | `v0.13.0` · 2026-06-29 | Security: frontend CSP/headers (Vercel), bounded payloads (`MAX_CONTENT_LENGTH` + `data` caps) + write rate limits, session-id rotation (fixation), login-timing equalisation, 72-byte password cap. Resilience: stale-CSRF self-heal + retry, central 401→logout, render error boundary. Calculator fixes: dividend growth (#77), reachability display (#33), Sankey input validation (#24). Plus dependency bumps + admin-portal cleanups. → [v0.13.0](docs/releases/v0.13.0.md) |
| **Phase 14 — Observability + analytics** *(1 of 3 Phase-14 sub-releases)* | `v0.14.0` · 2026-07-11 | Sentry (Flask #173 + React #174), structured request logging (#175), the `/api/health/ready` uptime probe (#176), and a PostHog EU-cloud activation funnel — SDK + funnel events (#177) surfaced server-side in `/admin` Analytics (#178). All credential-gated (off until keys set). No new product surface. → [v0.14.0](docs/releases/v0.14.0.md) |
| **Phase 14 — Data lifecycle + legal** *(2 of 3 Phase-14 sub-releases)* | `v0.14.1` · 2026-07-12 | Verified account-deletion cascade via a single `USER_SCOPED_TABLES` registry + drift guard (#179), "download my data" JSON export derived from the same registry (#180), Privacy/Terms brought current with trackers + export + verified erasure (#181), audit-logged admin support tools for deletion/export with privilege guards (#182). → [v0.14.1](docs/releases/v0.14.1.md) |
| **Phase 14 — CI confidence + scale sanity** *(3 of 3 — Phase 14 complete)* | `v0.14.2` · 2026-07-12 | Pure hardening, no product changes: `CI_REQUIRE_DB=1` (CI can't go green without the DB, #183), migration-system tests incl. never-reset publish toggles (#184), entitlement-boundary tests incl. suspension-after-password (#185), route-level E2E deletion cascade (#186), `pooling_check.py` Neon load tool (#187), auth rate limits pinned live (#188). Suite 132→147. → [v0.14.2](docs/releases/v0.14.2.md) |
| **Phase 15 — I&E bulk data entry** | `v0.15.0` · 2026-07-14 | The Monthly entry grid: month-at-a-time category sums as aggregate `source='monthly'` rows (#292 API, #293 grid UI, #294 overview verification + badge, #295 roadmap resequencing — billing → v0.16). Suites 192→204 / +10 backend. → [v0.15.0](docs/releases/v0.15.0.md) |

> Phases 1–5 integrated on `develop` (2026-06-11/12) with **no individual
> release tags**; they first reached production bundled in **`v0.6.0`**.

**Patch releases** (post-launch build-in-public patches — not new phases):

| Release | Shipped | Summary |
|---------|---------|---------|
| `v0.8.1` | 2026-06-14 | httpClient cold-start/network hardening (#17); finalized legal pages (Impressum/Terms/Privacy) with real operator + contact values; Phase 8 launch recorded in the docs. |
| `v0.8.2` | 2026-06-14 | Established `docs/releases/` per-release notes convention + the Release ritual checklist; backfilled v0.6.0–v0.8.1 notes. → [v0.8.2](docs/releases/v0.8.2.md) |
| `v0.8.3` | 2026-06-17 | Tag-triggered release workflow; Session protocol + milestone-based cycles; doc-ownership map. → [v0.8.3](docs/releases/v0.8.3.md) |
| `v0.11.1` | 2026-06-23 | Tracker polish & recurring transactions: one shared collapsible sidebar across the app + both trackers (#137), I&E Overview avg/median + monthly category + **recurring transactions** with a read-time cashflow forecast (#137, #141), Net Worth Overview polish — snapshot delta, debt-to-asset, liabilities breakdown, per-item gain (#140), and a compact app-wide footer. → [v0.11.1](docs/releases/v0.11.1.md) |
| `v0.12.1` | 2026-06-29 | Admin portal polish: **trackers toggleable from /admin** (publish state moved off the build-time `featureFlags.js`, now runtime via `publishable.py`), **superadmin role** (`users.is_superadmin`; only a superadmin grants/revokes admin, audit-logged), Analytics `Revenue · MRR` placeholder, and a verified data-safe publish toggle. → [v0.12.1](docs/releases/v0.12.1.md) |
| `v0.13.1` | 2026-06-29 | Marketing header rework: wordmark left · centered sections (Guide / Calculators / Comparison / ETFs and Stocks) · "Login App" hover-menu (Login/Register) right. Guide/Comparison/ETFs route to Beta "coming soon" pages (their full surfaces — SEO resource center, affiliate comparison, real-time ETF/stock search — are later cycles). → [v0.13.1](docs/releases/v0.13.1.md) |
| `v0.13.2` | 2026-06-30 | Marketing landing polish: full-width header; a continuous one-card-at-a-time `Carousel` (autoplay + arrows, no cut-off) for the calculator showcase and "More on the way" (which now shows the whole roadmap — trackers + unpublished calculators + the Guide/Comparison/ETFs sections); boxed value props with a section separator. → [v0.13.2](docs/releases/v0.13.2.md) |
| `v0.14.3` | 2026-07-14 | Calculator math fixes from the prod-wide QA sweep (#279): Compound Interest's inverted compounding-frequency ratio, Withdrawal Plan's real-return/balance-at-horizon/depleted-display trio, Coast FIRE's static-vs-rising coast threshold, FIRE's "0 yrs" on unreachable goals; the Net Worth category form permanently disabled after a tab switch (#282); plus input clamps (negative loan, negative Sankey amounts, NaN%) and label-association a11y across all `NumInput`s. 19 new regression tests. → [v0.14.3](docs/releases/v0.14.3.md) |
| `v0.14.4` | 2026-07-14 | `NumInput` min-clamp moved from keystroke to blur — raised-min fields (Barista/Coast FIRE ages, FIRE's 0.1-min withdrawal rate, the min=1 year/month fields) were untypeable, "numbers jumping around" (#288); README/CLAUDE.md status caught up with production — all 12 calculators + both trackers live (#289). 8 new `NumInput` tests, suite 184→192. → [v0.14.4](docs/releases/v0.14.4.md) |
| `v0.15.1` | 2026-07-14 | Custom I&E categories (user-scoped `ie_categories`: inline add, recoverable archive, duplicate-proof restore, lazy default seed — no data migration), color-coded grid fields (`NumInput` `tone`), "Bulk upload" coming-soon tab, Overview year-selector window fix. Suites 210 frontend / +7 backend. → [v0.15.1](docs/releases/v0.15.1.md) |

### ⬜ Future (prose only — not issues yet)

> Resequenced 2026-06-21 (proposal triage): ship the two trackers and a go-live
> review **before** the referral engine, and consolidate cleanup + security into a
> single phase. Trackers establish patterns and real user value first; the referral
> engine lands last so its rewards/fraud shape fits the launch posture decided in
> the product review.
>
> Resequenced 2026-06-28: the **Admin Control Center** (internal `/admin` portal —
> calculator publish toggles, GA4 analytics, user tier/suspend management) takes the
> `v0.12.0` slot; everything below slides one minor (Backlog cleanup + Security →
> `v0.13.0`, Product review → `v0.14.0`, Referral engine → `v0.15.0`).

- **Budgets** *(un-slotted backlog)* — per-category budgets (`fintrackr_dev` had
  them); a separate feature with its own UI surface. **Recurring transactions**
  (the other half of this item) shipped as a post-`v0.11.0` follow-up — a
  `(recurrence_unit, recurrence_interval)` pair on the transaction row plus a
  read-time cashflow forecast; see DECISIONS.md § "Income & Expense Tracker".
- **Net Worth Overview — goal line + FIRE tie-in** *(un-slotted backlog)* — a target
  net-worth line on the over-time chart (e.g. "reach $500K by 2030"), ideally seeded
  from / linked to the registry-driven FIRE calculators (the tracker and the FIRE calc
  answer the same question from two directions). Deferred: needs to *store* a goal
  (schema change) and a deliberate cross-feature contract between calculators and the
  tracker. A natural paid-tier hook. (Overview read-side polish — proper trend line +
  delta, debt-to-asset ratio, liabilities breakdown, per-item gain/loss — shipped
  separately as derive-only, no schema change.)
- **Net Worth snapshots — richer history** *(un-slotted backlog)* — per-asset history
  (one asset's value over time, not just aggregate NW) and snapshot comparison (diff any
  two snapshots per asset class); both need a richer snapshot shape (schema change).
  Auto/scheduled snapshots need a background-job concept that doesn't exist yet.
- **Product review & go-live readiness** *(landed as Phase 14, `v0.14.x` — kept for the record)* — full product
  audit before committing to a launch shape: what's working/missing, feedback
  synthesis, competitive landscape, and the launch-posture decision (freemium vs.
  free-only, positioning). Output: clarity on go-live + the v0.15.0+ roadmap.
- **Referral engine** *(moved to `v1.1` — see `docs/ROADMAP.md`; epic tickets pre-filed #218–#225)* — referral codes/links, attribution
  + reward tracking, abuse/fraud guards, three-layer gating (UI / route / DB), and
  its own DB tables + API namespace. Shape depends on the product-review outcome
  (rewards as Freemium entitlement grants); design decisions recorded in
  `DECISIONS.md` first.

**Marketing-site sections** (header links live now as Beta "coming soon" pages — `v0.13.1`; full surfaces are their own later cycles):
- **Guide — resource center / SEO content** *(future cycle)* — in-depth guides and
  articles (FIRE, investing, debt, wealth-building) as the organic-search growth
  engine. Likely its own content surface + CMS-ish authoring; the SEO payoff makes
  this a priority once the product review sets positioning.
- **Comparison — broker/account comparison (affiliate)** *(future cycle)* — side-by-side
  comparisons of brokers, accounts, and savings products with **affiliate links** —
  a planned **income stream**. Needs a data model for products + tracked outbound links.
- **ETFs & Stocks — real-time categorized search** *(future cycle)* — a searchable,
  categorized database of ETFs and stocks with **real-time pricing** (external market-data
  API + caching). Larger build; sequence after the product review.
- **Re-enable the 8 flag-gated calculators** *(un-slotted backlog — [#91](https://github.com/Nagoyashi/spreadsheet-millionaire/issues/91))*
  one at a time as build-in-public patches: Cash Flow Sankey, Investment Fee Impact,
  Inflation, Dividend, Withdrawal Plan, Mortgage, Coast FIRE, Barista FIRE. Slot
  into a cycle when launch sequencing is decided.
- **Discovery, analytics & support tooling** *(un-slotted backlog — [#89](https://github.com/Nagoyashi/spreadsheet-millionaire/issues/89))*
  — usage analytics, bug-reporting UI, customer feedback loop, incident-log tooling,
  marketing funnel. Likely informs / overlaps the product review (`v0.13.0`).
- **Freemium tier** — tier/entitlement model + three-layer gating (UI / route / DB).
- **Settings expansion** — currency preference, i18n, email-verification-on-change.
- **Design-system refresh** — extract shared primitives once the visual language settles.

> **Planned cycle sequence** now lives in `docs/ROADMAP.md` (resequenced
> 2026-07-14: `v0.15` I&E bulk data entry → `v0.16` Billing + free/premium
> boundary → `v0.17` bridge + Score → `v1.0`, then the growth loops). The
> sequence that used to sit here (Test & CI → trackers → cleanup/security →
> product review → referral) shipped as `v0.9.0`–`v0.14.x`; the referral engine
> moved to `v1.1` in the roadmap.

> Format going forward: one line per release — `<date> · vX.Y.Z · <summary>` →
> link to `docs/releases/`. Detail lives in the release file, not here. (Entries
> below predate this convention and are kept as the existing durable record.)

See `DECISIONS.md` § "Decisions still to make" for the open questions these carry.

## Phase log

> Durable completion notes, newest first. Deeper rationale → `DECISIONS.md`
> (linked per entry); per-task history lives on the board.

### 2026-06-21 — Phase 11 · `v0.11.0` — Income & Expense Tracker
- Second tracker: `ie_transactions` (#120), `/api/income-expense/*` CRUD +
  monthly/yearly summary (#121), transactions panel (#123) + recharts cashflow
  dashboard (#124), ship-dark flag (#122/#125), tests (#126). Settled the
  no-shared-tracker-framework decision (#119). → [v0.11.0](docs/releases/v0.11.0.md).

### 2026-06-21 — Phase 10 · `v0.10.0` — Net Worth Tracker
- First tracker: 5 normalised `nw_*` tables (#100), `/api/net-worth/*` CRUD +
  summary + snapshots (#101), tabbed Wealth page (#102) + category CRUD (#106) +
  recharts dashboard (#107); ships dark behind `NET_WORTH_ENABLED` (#104); tests
  (#103) + a dev session-cookie fix. → [v0.10.0](docs/releases/v0.10.0.md).

### 2026-06-20 — Phase 9 · `v0.9.0` — Test & CI foundation
- pytest + vitest harnesses, high-risk coverage (auth #29, IDOR #28, migration
  #30), ESLint + Prettier (#41), a CI gate with a Postgres service (#27), and
  leaked-credential rotation (#16). → [v0.9.0](docs/releases/v0.9.0.md).

### 2026-06-14 — `v0.8.1` — post-launch patch (cold-start hardening + legal finalization)
- **httpClient hardened** against network failures, timeouts, and non-JSON
  responses, so auth/reset forms no longer freeze on a Render cold-start 502:
  a 30s `AbortController` timeout, a uniform error shape (`request()` never
  rejects), and a shared `describeError()` (#17, PR #52).
- **Legal pages finalized.** Real operator details in the Impressum, German
  governing law in the Terms, the real published contact email — and the
  pre-launch placeholder scaffolding removed (PR #53).
- **Phase 8 launch recorded** in project.md / STATUS.md (PR #51).
- First post-launch build-in-public patch — no new phase.

### 2026-06-14 — Phase 8 · `v0.8.0` — launch (two-environment cutover)
- **Env-driven API proxy.** Replaced the hardcoded Vercel `/api/*` rewrite with a
  zero-dependency Vercel Edge Middleware that reads `BACKEND_ORIGIN` at the edge,
  so production and preview deployments proxy to separate backends and the backend
  URL never enters the client bundle (#49). → DECISIONS.md § "API proxy target is
  environment-driven".
- **Two-environment topology stood up.** Production: Vercel + the original Render
  service both track `main`, on the Neon **production** branch + prod Upstash + a
  prod-only `FLASK_SECRET_KEY`; www.spreadsheetmillionaire.com serves from `main`.
  Staging: a second Render service (`spreadsheetmillionaire-staging.onrender.com`)
  tracks `develop`, on the Neon **dev** branch + the original Upstash. Vercel
  `BACKEND_ORIGIN` scoped Production → prod Render, Preview → staging Render.
  → docs/DEPLOYMENT.md.
- **Verified live.** Environment isolation confirmed both directions (a production
  account fails on staging and vice versa); production Redis credentials fixed;
  production auth fully working (register / login / save / password-reset). First
  post-MVP production release on the custom domain — launch complete.

### 2026-06-13 — Phase 7 · `v0.7.0` — numeric input hardening
- Bounded + clamped numeric inputs across the four published calculators; `fmt()`
  gained B/T tiers + a `$999T+` ceiling and a `finiteOr` guard for derived metrics.
  → DECISIONS.md § "Numeric input is bounded and clamped at the shared component".
- Formalized the merge strategy (squash `feature/*`→`develop`; merge commit
  `develop`→`main`). → DECISIONS.md § "Git branching model".

### 2026-06-13 — Phase 6 · `v0.6.0` — marketing landing, `/app` restructure, legal
- Public marketing landing at `/`, app moved under `/app/*` (param-preserving
  redirects), privacy/terms/imprint pages. → DECISIONS.md §§ "Marketing landing
  page — same Vite app, route at /", "SPA SEO limitation accepted", "Marketing
  page invents nothing".
- Added STATUS.md as the technical reference. First production release since the prototype.

### 2026-06-12 — Phase 5 — password reset + account settings
- Self-service password reset via hashed, single-use, 60-minute tokens (no
  enumeration). → DECISIONS.md § "Password reset via hashed single-use tokens".
- `/settings` (change password / change email / delete account) as one stacked,
  auth-guarded page. → DECISIONS.md § "Settings as a single stacked page".

### 2026-06-12 — Phase 4 — mobile usability + tracker teasers
- Mobile-first responsive pass (44px hit areas, single sidebar drawer, no-zoom inputs).
- Net Worth / Income-Expense teasers kept in their own module, out of the
  calculator registry. → DECISIONS.md § "Tracker teasers outside the calculator registry".

### 2026-06-12 — Phase 3 — staging deploy readiness
- Single-origin deploy: Vercel serves the SPA and rewrites `/api/*` to Render
  (first-party cookies, no CORS surface). → DECISIONS.md § "Single-origin
  deployment via Vercel rewrite proxy".
- gunicorn (2 workers) + ProxyFix + a rate-limit-exempt `/api/health` probe.
  → DECISIONS.md § "gunicorn with 2 workers + ProxyFix".

### 2026-06-12 — Phase 2 — backend migration to managed services
- Off SQLite to Postgres (Neon); sessions + rate-limit counters to Redis
  (Upstash); transactional email via Resend. → DECISIONS.md §§ "Postgres on
  Neon", "Redis sessions via Upstash", "Transactional email via Resend",
  "Rate limiting via Flask-Limiter with per-route configuration".
- Stayed no-ORM (raw psycopg, parameterised, `user_id` on every user-scoped
  query); calc-type CHECK constraint rebuilds from the single backend source.
  → DECISIONS.md §§ "No ORM — raw SQL via psycopg", "Single source of truth for calc types (backend)".

### 2026-06-11 — Phase 1 — rename + MVP narrowing
- Renamed to SpreadsheetMillionaire; introduced the `published` flag, narrowing
  the public app to **4 calculators** (`fire`, `compound`, `emergency_fund`,
  `debt_payoff`); the other 8 stay valid backend types and loadable. None
  re-enabled since. → DECISIONS.md § "MVP narrowing via `published` flag".
- Adopted `main` ← `develop` ← `feature/*` with PRs + conventional commits.
  → DECISIONS.md § "Git branching model".

### 2026-06-09 — Prototype · `v0.1.0-prototype` + Sankey rebuild
- Tagged the prototype.
- Rebuilt Sankey as a 4-column nested-group diagram (currency / % toggle,
  client-side permalink) with a v1→v2 saved-data migration — the first real
  exercise of the versioning system. → DECISIONS.md §§ "Sankey v2 — nested
  groups, restyle, permalink", "Saved-data versioning".

### Prototype era (2026-04 → 2026-06, approx.)
- **2026-05-31** — Authored DECISIONS.md + PROJECT_STRUCTURE.md (the *why* and
  the file map). → DECISIONS.md §§ "State management", "Auth state via props, not
  Context", "Favourites in localStorage, not in the DB".
- **2026-05-05 (approx.)** — Modularity pass: shared `fmt()`, calculator
  input/save hooks, lazy-loaded calculators, registry-driven explainers, and UI
  de-duplication (AuthForm, UserFooter, CalculatorPage orchestrator, "New" +
  click-to-deselect). → DECISIONS.md §§ "Number formatting via shared `fmt()`",
  "Calculator input state via `useCalculatorInputs`", "Save logic in `useSave`…",
  "Lazy-loaded calculators…", "Calculator explainers driven by registry",
  "Shared HTTP client + CSRF injection", and the UI-extraction sections.
- **2026-04-30 (approx.)** — Auth & security foundations: bcrypt + 8-char rule,
  password-confirmed account deletion, session/header CSRF (token in JS memory),
  Talisman headers, fail-loud `.env` config. → DECISIONS.md §§ "bcrypt + 8-char
  password rule", "Account deletion requires password re-confirmation", "CSRF on
  session, not cookie", "CSRF token lives in JS memory…", "Security headers via
  Flask-Talisman", "Config from `.env`…".
- **2026-04-28** — Introduced the single `registry.js` and grew the calculator
  set toward 12. → DECISIONS.md § "Registry-driven calculator system".
- **2026-04-20** — Project bootstrapped: Flask backend + React/Vite frontend.

### 2026-06-14 — Project management setup
- Created the GitHub Project board "spreadsheetmillionaire.com" (Backlog default
  + Blocked status; Auto-add / item-added→Backlog / item-closed→Done workflows);
  defined the `type:*` / `prio:*` label taxonomy. The board owns per-task
  execution; this file owns the phase-level plan.
