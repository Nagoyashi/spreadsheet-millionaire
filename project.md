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

## Current cycle

> Canonical cycle state = the single **open GitHub Milestone**. This line mirrors
> it for at-a-glance reading in the editor; if they disagree, the milestone wins.

**Between cycles** · `v0.8.1` live in production at www.spreadsheetmillionaire.com
(2026-06-14) · next candidates in § "Future" (re-enable the flag-gated
calculators, then the trackers) · backlog on the
[Project board](https://github.com/users/Nagoyashi/projects) ↗

Each release cycle is a Milestone named for its target version (`v0.9.0`); its
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

> Phases 1–5 integrated on `develop` (2026-06-11/12) with **no individual
> release tags**; they first reached production bundled in **`v0.6.0`**.

**Patch releases** (post-launch build-in-public patches — not new phases):

| Release | Shipped | Summary |
|---------|---------|---------|
| `v0.8.1` | 2026-06-14 | httpClient cold-start/network hardening (#17); finalized legal pages (Impressum/Terms/Privacy) with real operator + contact values; Phase 8 launch recorded in the docs. |
| `v0.8.2` | 2026-06-14 | Established `docs/releases/` per-release notes convention + the Release ritual checklist; backfilled v0.6.0–v0.8.1 notes. → [v0.8.2](docs/releases/v0.8.2.md) |
| `v0.8.3` | 2026-06-17 | Tag-triggered release workflow; Session protocol + milestone-based cycles; doc-ownership map. → [v0.8.3](docs/releases/v0.8.3.md) |

### ⬜ Future (prose only — not issues yet)

- **Re-enable the 8 flag-gated calculators** one at a time as build-in-public
  patches: Cash Flow Sankey, Investment Fee Impact, Inflation, Dividend,
  Withdrawal Plan, Mortgage, Coast FIRE, Barista FIRE.
- **Net Worth Tracker** — own pages, API namespace, DB tables.
- **Income & Expense Tracker** — own pages, API namespace, DB tables.
- **Freemium tier** — tier/entitlement model + three-layer gating (UI / route / DB).
- **Settings expansion** — currency preference, i18n, email-verification-on-change.
- **Design-system refresh** — extract shared primitives once the visual language settles.

> Format going forward: one line per release — `<date> · vX.Y.Z · <summary>` →
> link to `docs/releases/`. Detail lives in the release file, not here. (Entries
> below predate this convention and are kept as the existing durable record.)

See `DECISIONS.md` § "Decisions still to make" for the open questions these carry.

## Phase log

> Durable completion notes, newest first. Deeper rationale → `DECISIONS.md`
> (linked per entry); per-task history lives on the board.

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
