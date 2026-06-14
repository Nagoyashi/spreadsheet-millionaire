# Project Log — spreadsheetmillionaire.com

Reverse-chronological. Newest first. What changed + why (short).
Architectural rationale lives in DECISIONS.md — link, don't duplicate.

## Current state
- Live in production (Render). Flask API + React/Vite SPA.
- MVP ships 4 of 12 calculators; other 8 hidden behind `published`, re-enabled
  one at a time as build-in-public patches.
- Task tracking via GitHub Project "spreadsheetmillionaire.com" + Issues.

---

## 2026-06-14 — Project management setup
- Created GitHub Project "spreadsheetmillionaire.com" (per-repo board).
- Status field: added Backlog (default) and Blocked.
- Workflows: Auto-add (`is:issue is:open`), Item added → Backlog, Item closed → Done.
- Defined `type:*` / `prio:*` labels.
- Added Task tracking + Project log sections to CLAUDE.md.

## 2026-06-13 — v0.7.0: numeric input hardening (Phase 7)
- Bounded + clamped numeric inputs across the four published calculators; `fmt()`
  gained B/T tiers + a `$999T+` ceiling and a `finiteOr` guard for derived metrics.
  → DECISIONS.md § "Numeric input is bounded and clamped at the shared component".
- Formalized the merge strategy: squash for `feature/*`→`develop`, merge commit for
  `develop`→`main`. → DECISIONS.md § "Git branching model".
- Released **v0.7.0** (merge #15).

## 2026-06-13 — v0.6.0: marketing landing, /app restructure, legal pages (Phase 6)
- Public marketing landing at `/`, the app moved under `/app/*` (param-preserving
  redirects), plus privacy/terms/imprint pages. → DECISIONS.md §§ "Marketing landing
  page — same Vite app, route at /", "SPA SEO limitation accepted", "Marketing page
  invents nothing".
- Added STATUS.md as the technical reference.
- Released **v0.6.0** (merge #11) — first tagged release since the prototype.

## 2026-06-12 — Phase 5: password reset + account settings
- Self-service password reset via hashed, single-use, 60-minute tokens (no enumeration).
  → DECISIONS.md § "Password reset via hashed single-use tokens".
- `/settings` page (change password / change email / delete account) as one stacked,
  auth-guarded page. → DECISIONS.md § "Settings as a single stacked page".

## 2026-06-12 — Phase 4: mobile usability + tracker teasers
- Mobile-first responsive pass (44px hit areas, single sidebar drawer, no-zoom inputs).
- Net Worth / Income-Expense teasers kept in their own module, out of the calculator
  registry. → DECISIONS.md § "Tracker teasers outside the calculator registry".

## 2026-06-12 — Phase 3: staging deploy readiness
- Single-origin deploy: Vercel serves the SPA and rewrites `/api/*` to the Render
  backend (first-party cookies, no CORS surface). → DECISIONS.md § "Single-origin
  deployment via Vercel rewrite proxy".
- gunicorn (2 workers) + ProxyFix + a rate-limit-exempt `/api/health` probe; staging
  runbook added. → DECISIONS.md § "gunicorn with 2 workers + ProxyFix".

## 2026-06-12 — Phase 2: backend migration to managed services
- Moved off SQLite to Postgres (Neon); server-side sessions + rate-limit counters to
  Redis (Upstash); transactional email via Resend. → DECISIONS.md §§ "Postgres on
  Neon", "Redis sessions via Upstash", "Transactional email via Resend", "Rate limiting
  via Flask-Limiter with per-route configuration".
- Stayed no-ORM (raw psycopg, parameterised, `user_id` on every user-scoped query);
  the calc-type CHECK constraint rebuilds from the single backend source. → DECISIONS.md
  §§ "No ORM — raw SQL via psycopg", "Single source of truth for calc types (backend)".

## 2026-06-11 — Phase 1: rename + MVP narrowing
- Renamed to SpreadsheetMillionaire; introduced the `published` flag and narrowed the
  public app to **4 calculators — `fire`, `compound`, `emergency_fund`, `debt_payoff`** —
  hiding the other 8 (still valid backend types, still loadable). These four are the only
  ones published to date; none re-enabled since. → DECISIONS.md § "MVP narrowing via
  `published` flag".
- Adopted the `main` ← `develop` ← `feature/*` model with PRs and conventional commits.
  → DECISIONS.md § "Git branching model".

## 2026-06-09 — v0.1.0-prototype tag + Sankey rebuild
- Tagged the prototype (**v0.1.0-prototype**).
- Rebuilt Sankey as a 4-column nested-group diagram (currency / % toggle, client-side
  permalink) with a v1→v2 saved-data migration — the first real exercise of the
  versioning system. → DECISIONS.md §§ "Sankey v2 — nested groups, restyle, permalink",
  "Saved-data versioning".

## 2026-05-31 — Architecture documented
- Authored DECISIONS.md and PROJECT_STRUCTURE.md — the *why* and the file map. The
  foundational app-shape choices made across the prototype are captured there. →
  DECISIONS.md §§ "State management", "Auth state via props, not Context", "Favourites
  in localStorage, not in the DB".

## 2026-05-05 — Modularity pass (approx.)
- Extracted shared `fmt()`, the calculator input/save hooks, lazy-loaded calculators,
  and registry-driven explainers. → DECISIONS.md §§ "Number formatting via shared
  `fmt()`", "Calculator input state via `useCalculatorInputs`", "Save logic in `useSave`
  with `activeSavedCalcId` reset on type change", "Lazy-loaded calculators with skeleton
  fallback", "Calculator explainers driven by registry", "Shared HTTP client + CSRF
  injection".
- De-duplicated the UI and interaction patterns (AuthForm, UserFooter, CalculatorPage as
  orchestrator, "New" + click-to-deselect). → DECISIONS.md §§ "Login/Register pages as
  thin wrappers around `<AuthForm>`", "`<UserFooter>` shared across LandingPage +
  CalculatorSidebar", "CalculatorPage as orchestrator only", "\"New\" button + sidebar
  click-to-deselect".

## 2026-04-30 — Auth & security foundations (approx.)
- bcrypt hashing + 8-char password rule, password-confirmed account deletion,
  session-stored / header-verified CSRF (token held in JS memory), Talisman security
  headers, and fail-loud `.env` config. → DECISIONS.md §§ "bcrypt + 8-char password
  rule", "Account deletion requires password re-confirmation", "CSRF on session, not
  cookie", "CSRF token lives in JS memory, not localStorage", "Security headers via
  Flask-Talisman", "Config from `.env`, app exits on missing/invalid secret".

## 2026-04-28 — Calculator registry + full set
- Introduced the single `registry.js` driving all calculator metadata and grew the set
  toward the full 12. → DECISIONS.md § "Registry-driven calculator system".

## 2026-04-20 — Project bootstrapped
- Initial commit; Flask backend + React/Vite frontend scaffolding stood up over the
  following days.
