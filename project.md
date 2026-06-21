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

**Phase 10 — Net Worth Tracker** shipped as `v0.10.0` (2026-06-21). Next up:
Phase 11 — Income & Expense Tracker (`v0.11.0`), not yet opened as a milestone.
(Roadmap resequenced 2026-06-21 — trackers and a go-live review come before the
referral engine; see § Future.)

## Current cycle

> Canonical cycle state = the single **open GitHub Milestone**. This line mirrors
> it for at-a-glance reading in the editor; if they disagree, the milestone wins.

**Between cycles.** `v0.10.0` — Net Worth Tracker shipped (2026-06-21), built
production-ready but **dark** behind `NET_WORTH_ENABLED` (prod still shows "Coming
soon"); no milestone is currently open. The next cycle is `v0.11.0` — Income &
Expense Tracker (see § Future) — open its milestone and promote its issues when
starting it. `v0.8.1` live in production at www.spreadsheetmillionaire.com ·
backlog on the [Project board](https://github.com/users/Nagoyashi/projects) ↗

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

> Phases 1–5 integrated on `develop` (2026-06-11/12) with **no individual
> release tags**; they first reached production bundled in **`v0.6.0`**.

**Patch releases** (post-launch build-in-public patches — not new phases):

| Release | Shipped | Summary |
|---------|---------|---------|
| `v0.8.1` | 2026-06-14 | httpClient cold-start/network hardening (#17); finalized legal pages (Impressum/Terms/Privacy) with real operator + contact values; Phase 8 launch recorded in the docs. |
| `v0.8.2` | 2026-06-14 | Established `docs/releases/` per-release notes convention + the Release ritual checklist; backfilled v0.6.0–v0.8.1 notes. → [v0.8.2](docs/releases/v0.8.2.md) |
| `v0.8.3` | 2026-06-17 | Tag-triggered release workflow; Session protocol + milestone-based cycles; doc-ownership map. → [v0.8.3](docs/releases/v0.8.3.md) |

### ⬜ Future (prose only — not issues yet)

> Resequenced 2026-06-21 (proposal triage): ship the two trackers and a go-live
> review **before** the referral engine, and consolidate cleanup + security into a
> single phase. Trackers establish patterns and real user value first; the referral
> engine lands last so its rewards/fraud shape fits the launch posture decided in
> the product review.

- **Income & Expense Tracker** *(next cycle — targeted at `v0.11.0`)* — second
  tracker, reusing the Net Worth patterns (normalised `*_` tables, generic CRUD
  manager, recharts). Own pages, API namespace, DB tables. Scope decided at
  design (#119): one `ie_transactions` stream + monthly/yearly summary +
  dashboard; **no shared tracker framework** (trackers stay ad-hoc, reusing
  primitives). Promote to a milestone with issues when starting it.
- **Recurring transactions & budgets** *(un-slotted backlog)* — deferred from the
  Income & Expense cycle (`fintrackr_dev` had both); substantial enough for their
  own cycle once the transaction tracker ships.
- **Backlog cleanup + Security hardening** *(targeted at `v0.12.0`)* — one
  consolidation cycle after the trackers land: sweep accumulated board backlog
  (tech debt, bugs, small gaps) **and** harden security for finance-app credibility
  (input-validation hardening, API auth tightening, data-handling review). Scope
  drawn from the board at the time, not pre-listed here.
- **Product review & go-live readiness** *(targeted at `v0.13.0`)* — full product
  audit before committing to a launch shape: what's working/missing, feedback
  synthesis, competitive landscape, and the launch-posture decision (freemium vs.
  free-only, positioning). Output: clarity on go-live + the v0.14.0+ roadmap.
- **Referral engine** *(targeted at `v0.14.0`)* — referral codes/links, attribution
  + reward tracking, abuse/fraud guards, three-layer gating (UI / route / DB), and
  its own DB tables + API namespace. Shape depends on the product-review outcome
  (rewards as Freemium entitlement grants); design decisions recorded in
  `DECISIONS.md` first.
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

> **Planned cycle sequence** (prose intent, not yet milestones — open one at a time
> per the Session protocol): `v0.9.0` Test & CI ✅ → `v0.10.0` Net Worth Tracker ✅
> → `v0.11.0` Income & Expense Tracker (next) → `v0.12.0` Backlog cleanup +
> Security hardening → `v0.13.0` Product review & go-live readiness → `v0.14.0`
> Referral engine. The Freemium tier slots in wherever entitlement/rewards work
> forces it (likely alongside the referral engine, after the product review).

> Format going forward: one line per release — `<date> · vX.Y.Z · <summary>` →
> link to `docs/releases/`. Detail lives in the release file, not here. (Entries
> below predate this convention and are kept as the existing durable record.)

See `DECISIONS.md` § "Decisions still to make" for the open questions these carry.

## Phase log

> Durable completion notes, newest first. Deeper rationale → `DECISIONS.md`
> (linked per entry); per-task history lives on the board.

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
