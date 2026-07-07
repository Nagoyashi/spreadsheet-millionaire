# SpreadsheetMillionaire — Architectural Decisions

> A snapshot of the *why* behind SpreadsheetMillionaire's structure. `PROJECT_STRUCTURE.md`
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

## MVP narrowing via `published` flag

**TL;DR:** A required `published` boolean on each registry entry gates the public app. Four calculators are published; eight are hidden, not deleted.

**Decision:** Every `registry.js` entry carries a required `published` boolean. The public MVP publishes four (`fire`, `compound`, `emergency_fund`, `debt_payoff`); the other eight stay in the codebase with `published: false`. The user-facing surface (sidebar nav, landing grid, category tabs, routing guard) derives from `PUBLISHED_CALCULATORS`; `backend/calc_types.py` keeps all twelve types valid.

**Why flag instead of delete:**
- Re-enabling a calculator as a build-in-public patch is a one-line flip (`false` → `true`), not a resurrection from git history — no dead-code rot, no re-wiring.
- Saved user rows for hidden calculators stay loadable: the backend still accepts all twelve types, so nothing breaks for data created before the narrowing or on `develop`.
- The hidden calculators stay testable on `develop` — their components still build and route there during development — without being exposed in production.
- A flag keeps the diff that re-enables a calculator tiny and reviewable; deleting would mean losing the work and re-reviewing it on return.

**Why a frontend-only concern:** The narrowing is about what the public *sees*, not what the server *accepts*. Gating server-side too would break saved rows and make the hidden calculators untestable. The single backend `VALID_CALC_TYPES` list stays at twelve on purpose.

**When to revisit:** Once all twelve are published (or any that won't ship are genuinely retired), the flag can be removed and the derived `PUBLISHED_*` exports collapsed back into the base list. Until the set is final, the flag stays.

## Runtime publish state — DB-backed, admin-toggleable

**TL;DR:** The admin portal (Phase 12) needs to publish/unpublish calculators **live**, so publish state moves from the build-time `registry.js` constant into a `calculator_publish` DB table. The registry still owns *metadata*; the DB owns *published-or-not*. This deliberately revises the back half of § "MVP narrowing via `published` flag" and the registry-only wording of CLAUDE.md hard rule #3.

**Decision:** A `calculator_publish` table (`calc_type` PK, `published`, `updated_at`, `updated_by`) is the runtime source of truth for the public surface. It's **seeded** from `calc_types.DEFAULT_PUBLISHED_TYPES` (the same four MVP calculators the registry shipped with) via idempotent `INSERT ... ON CONFLICT DO NOTHING`, so a migration never resets an admin's live toggle — it only backfills rows for newly-added calc types. The admin portal writes it (`PATCH /api/admin/calculators/:type`), the public `/app` reads it (`GET /api/calculators/published`, unauthenticated). The frontend registry keeps name/icon/category/descriptor; only the boolean moved.

**Why move it out of the registry, against the original "frontend-only concern" stance:** That stance held when publishing was a developer action shipped in a build. The product now needs a *non-engineer, no-deploy* toggle from the admin portal, which a bundled constant fundamentally can't provide. So publish state becomes runtime data. `VALID_CALC_TYPES` staying at twelve server-side is unchanged and still right — validity ≠ visibility; saved rows for unpublished calculators remain loadable exactly as before.

**Frontend consumer change (lands in the same cycle, after this backend foundation):** `PUBLISHED_TYPES` / `PUBLISHED_CALCULATORS` stop being static registry derivations and become a runtime fetch of `/api/calculators/published`, merged with registry metadata, **with the registry's build-time `published` as the fallback** if the request fails (so the app always renders). Consumers (sidebar, landing grid, route guards) still read a single derived published set — hard rule #3's *single-source* discipline holds; only the source flips from compile-time to runtime. CLAUDE.md rule #3 is updated when that wiring lands.

**When to revisit:** If publish state ever needs per-environment or scheduling nuance, this table is where it grows. If the admin portal is dropped, fold the boolean back into the registry.

**Trackers join the same mechanism (v0.12.1) — the build-time tracker flags are gone.** The Net Worth + Income & Expense trackers previously shipped dark behind build-time `VITE_NETWORTH_ENABLED` / `VITE_INCOME_EXPENSE_ENABLED` flags (`featureFlags.js`). That file is **deleted**; tracker visibility now rides this same runtime `calculator_publish` mechanism. `backend/publishable.py` defines `PUBLISHABLE_TYPES = VALID_CALC_TYPES + TRACKER_TYPES` (`'net-worth'`, `'income-expenses'` — slugs matching the routes); `db_init` seeds a row per publishable type (trackers default **unpublished** = coming soon). The frontend's `trackers.js` exposes `useLiveTrackers()` / `useVisibleUpcoming()` (runtime hooks over `usePublishedTypes`, replacing the old static `LIVE_TRACKERS`/`VISIBLE_UPCOMING`), and the `/app/net-worth` + `/app/income-expenses` route guards check the published set instead of a flag. Net effect: **revealing a tracker out of "coming soon" is an admin toggle in /admin Overview, not a redeploy** — exactly the eventual waiting-list launch lever. This supersedes the "ships dark behind a feature flag" launch-gating notes in §§ "Net Worth Tracker" / "Income & Expense Tracker".

## Superadmin role — only a superadmin grants admin

**TL;DR:** A second flag, `users.is_superadmin`, sits above `is_admin`. Only a superadmin can grant/revoke the admin role (from the Users screen); normal admins can't make other admins. A superadmin is implicitly an admin.

**Decision:** `users.is_superadmin BOOLEAN DEFAULT false`. The model treats a superadmin as an admin (`is_admin` is `true` whenever `is_superadmin` is), so all admin gates pass. A `superadmin_required` decorator (same 401/404-invisible posture as `admin_required`) guards the one superadmin-only route, `PATCH /api/admin/users/:id/admin { is_admin }` — grant/revoke audited (`grant_admin`/`revoke_admin`), with guards against changing your own role or revoking a superadmin's admin. The Users screen shows the "Make/Revoke admin" action only to a superadmin (gated on `auth.user.is_superadmin`). Like the first admin, **superadmin is bootstrapped manually** (`User.set_superadmin`, a DB/shell lever — no UI grants it), since someone has to be first.

**Why a flag, not a full role system:** same call as § "Admin portal auth" — three levels (user < admin < superadmin) and a handful of privileged accounts. A second boolean expresses the only distinction that matters (who can mint admins) without an RBAC table. Revisit if admin powers ever need finer slices.

**Tiers auto-adjust later via billing (deferred).** Manual tier control stays — it's the beta comp lever and a permanent override. When billing lands, a subscription webhook will set `users.tier` automatically on upgrade/downgrade/cancel; the manual control remains for comps/corrections. The Analytics **Revenue · MRR** KPI is a placeholder (`null` → "—") until billing sums it from active paid subscriptions.

## Admin portal auth — `is_admin` column + `admin_required` (404, not 403)

**TL;DR:** Admin access is a single `users.is_admin` boolean, checked fresh from the DB on every `/api/admin/*` request by an `admin_required` decorator that returns **404** (not 403) to non-admins. No roles table, no admin self-serve.

**Decision:** `users.is_admin BOOLEAN NOT NULL DEFAULT false` is the one source of truth for who is an admin; admins are promoted manually (`User.set_admin`, a DB/shell lever — there is deliberately no UI to grant admin). `admin_required` layers on `login_required`'s posture: 401 with no session, **404** for a logged-in non-admin — the portal must not acknowledge its own existence to normal users (the spec's "redirect/404 for non-admins, never expose it"). Status is read live from the column each request, so a demotion takes effect immediately, not at next login. The portal's mutations are gated at all three layers (hard rule #8): the SPA `/admin` route guard (UI), `admin_required` (route), and — for any future admin-scoped data — the query layer.

**Why a boolean, not a roles/permissions system:** There is exactly one privileged role (founder/admin) and a handful of admins. An RBAC table would be ceremony for a binary distinction. If tiers of admin power ever appear, this is the revisit point — but not before.

**Why 404 over 403:** A 403 confirms `/admin` exists and just isn't yours; a 404 leaks nothing. For an internal portal that can suspend users and flip the public site, invisibility to non-admins is worth the tiny semantic fib.

## Account tiers, suspension & the admin audit log

**TL;DR:** Tier is a single `users.tier` enum (`free`/`pro`/`elite`, single-sourced in `user_tiers.py`); `users.suspended` blocks login; every admin tier/suspend change appends to an `admin_audit_log` (write-only for now). Set from the admin Users screen.

**Decision:** `users.tier TEXT DEFAULT 'free'` (CHECK from `user_tiers.USER_TIERS`, the `calc_types.py` single-source pattern) + `users.suspended BOOLEAN` + `users.last_login_at TIMESTAMPTZ` (stamped on login). During beta everyone is `free` and billing is off — tiers are **manual comp** an admin sets, with **no entitlement enforcement yet** (the Freemium gate is the deferred `v0.14.0` product-review decision). Suspension is real: a suspended account is blocked at login (403, checked only after the password verifies so it doesn't leak which emails exist), and an admin can't suspend their own account (lockout guard). Tier/suspend mutations go through `PATCH /api/admin/users/:id` and each append an `admin_audit_log` row (`admin_user_id`, `action`, `target_user_id`, JSONB `detail` with before/after). The audit log is **write-only this phase** — surfacing "this account's history" is a later read-side feature (the `target_user_id` index is already there).

**Why store the audit detail as JSONB:** `{"from":"free","to":"pro"}` is queryable later without a column-per-action-type schema, and psycopg adapts a dict directly. The two user FKs are `ON DELETE SET NULL` so the trail outlives the accounts it describes.

**Deferred (not built):** Activity (top calculator + run count) needs the GA4 `calc_run` event (Analytics phase, #152); LTV needs billing. Both render as placeholders (`—` / `$0.00`) until those land.

## Admin analytics — GA4 proxy with a DB-backed empty state

**TL;DR:** `GET /api/admin/analytics` always returns real signup + funnel numbers from our **own DB**; visitors / traffic sources / per-calculator runs come from **GA4 via a server-side proxy** when configured, else null with `configured: false`. The GA4 SDK is an **optional, lazily-imported** dependency so nothing is added to the default install until GA4 is actually wired.

**Decision:** `services/analytics.py` assembles the payload. The DB half (total accounts, new signups in range, the Free/Pro/Elite funnel from `tier_counts`) is always present — it's ours, no third party needed. The GA half (`total_visitors`, `visitors_over_time`, `traffic_sources`, `top_calculators`) is fetched from the **GA4 Data API** with a **service-account key kept server-side** (`GA4_PROPERTY_ID` + `GA4_CREDENTIALS_JSON` env; never shipped to the client — hard rule spirit). When GA4 is unconfigured the endpoint returns `configured: false` and the GA fields null; the UI shows a "connect GA4" empty state but **still renders the real signup KPIs + funnel**. A configured-but-broken GA4 (missing SDK, bad creds, API error) surfaces as `ga_error` rather than a 500, and each GA sub-report is independently defensive (one failing section → null, not total failure).

**Why the GA4 SDK is optional + commented in requirements.txt:** `google-analytics-data` pulls grpc/protobuf — heavy, and **unused until GA4 is configured**. Per the "deliberately boring, justify deps against the problem" rule, it stays commented; `_ga4_metrics` imports it lazily and raises a clear "add it to requirements" `AnalyticsError` if GA4 is configured without it. So the default install/CI/prod stay lean, and the empty state needs zero new deps.

**Deferred (needs explicit setup, not built here):**
- The **`calc_run` custom event** the "Most-used calculators" ranking depends on. Emitting it means adding GA4 (gtag) to the **public** site, which is a privacy decision (the app currently declines non-essential cookies and has a privacy policy) — out of scope for the empty-state phase and not done without that review.
- `Free → Paid` KPI + the Pro/Elite funnel stages stay disabled ("activate after beta") until billing exists.

## Error monitoring via Sentry (backend)

**TL;DR:** Unhandled backend errors report to **Sentry**, but the whole integration is **DSN-gated** — no `SENTRY_DSN`, no init, no network calls. So dev, CI, and a fresh checkout run with monitoring off and zero config; production sets the DSN and gets error capture. A missing DSN in production is a **startup warning, not an exit** — monitoring must never be load-bearing for availability.

**Decision:** `app._init_sentry()` runs at the very top of `create_app()`, *before* the Flask app is built, so `FlaskIntegration` wraps request handling from the first request and each gunicorn worker (which calls the factory after fork) gets its own client. It returns early when `Config.SENTRY_DSN` is empty, so the call is a no-op without a DSN. Config lives in `config.py`: `SENTRY_DSN` (the gate), `SENTRY_TRACES_SAMPLE_RATE` (cost knob, default 0.1 — set 0 for errors-only), `SENTRY_ENVIRONMENT` (defaults to `FLASK_ENV`), `SENTRY_RELEASE` (optional deploy/commit tag). The existing `@app.errorhandler(500)` does **not** suppress capture — Sentry hooks Flask's `got_request_exception` signal, which fires before error handlers.

**Why `send_default_pii=False` (privacy invariant 8):** Sentry defaults to attaching request bodies, cookies, and user identifiers to events. This is a personal-finance app; those payloads carry financial inputs and session material. Disabling default PII keeps events to stack traces + non-sensitive request metadata. Pair with a **Sentry EU-region DSN** so the event data that *is* sent stays in the EU. Both are posture, not a hard gate — but they're the intended production configuration.

**Why DSN-gated rather than a separate `SENTRY_ENABLED` flag:** the DSN is both the switch and the credential — there is nothing to enable without one, and a stray `SENTRY_ENABLED=true` with no DSN would be a silent no-op anyway. One env var, one meaning. Mirrors the `RESEND_API_KEY` / GA4 "absent key disables the feature" pattern already in `config.py`.

**Frontend Sentry (#174)** is a separate integration wired into the central 401-logout path and the render-error boundary — tracked apart from this backend decision.

## Structured request logging

**TL;DR:** One structured log line per request (method, path, status, duration) via Flask before/after hooks, JSON to stdout in production and a readable line in dev. Each request gets an id echoed on `X-Request-ID` and tagged onto the Sentry scope, so a log line, a support report, and a Sentry event for the same request correlate. **Stdlib only** — no logging dependency added.

**Decision:** `backend/logging_config.py` owns both halves. `configure_logging()` installs a single stdout handler on the root logger (idempotent via a marker attribute, since the test suite builds the app many times) — a `JsonFormatter` in production, a plain `%(asctime)s …` line in dev, chosen by `LOG_FORMAT` (defaults per environment, overridable). `install_request_logging(app)` registers a `before_request` that stamps `g.request_id` (honouring an upstream `X-Request-ID` if present) and a start time, and an `after_request` that emits the line and sets the response header. Status maps to level: 5xx → ERROR, 4xx → WARNING, else INFO, so error dashboards filter for free. Wired from `create_app()`: `configure_logging()` first (before anything logs), `install_request_logging()` after blueprints.

**Why stdlib and not `structlog` / `python-json-logger`:** the whole need is "emit a JSON object per request." A ~30-line `JsonFormatter` that serialises the base record plus any `extra` fields covers it, keeping with the "deliberately boring, justify deps against the problem size" rule. The formatter treats any non-standard `LogRecord` attribute as a structured field, so `logger.log(level, "request", extra={...})` is the whole call site.

**Privacy (invariant 8):** a request line carries method, **path without query string**, status, and duration — deliberately **not** the client IP, the user id, the request body, or headers. The goal is knowing which endpoints are slow or erroring, not who called them, which keeps the access log free of personal data by construction. It complements Sentry's `send_default_pii=False`: same posture, different signal.

**Why `/api/health` is skipped:** Render's health check and the keepalive pinger (and uptime monitoring, #176) poll it every few minutes. Logging every poll would bury the real request signal, so the health path is excluded from the log line — but it still gets a request id and the `X-Request-ID` header.

## Tracker teasers outside the calculator registry

**TL;DR:** The two upcoming trackers live in their own `upcomingFeatures.js` module, not in `registry.js`. The registry stays calculators-only.

**Decision:** The build-in-public teasers for the Net Worth and Income/Expense trackers are defined once in `frontend/src/upcomingFeatures.js` (`UPCOMING_FEATURES`: `{ slug, label, Icon, blurb, eta }`). Only two surfaces consume that list — the `LandingPage` grid (dashed "Coming soon" cards after the calculators) and the `CalculatorSidebar` "Coming soon" section. They link to `ComingSoonPage` at `/coming-soon/:slug`, which redirects unknown slugs to `/` exactly as `CalculatorPage` redirects unknown/unpublished calculator types.

**Why not just add them to the registry with `published: false`:** The `published` flag hides a calculator from the *public surface*, but every registry entry is still a fully-formed, saveable calculator — it has a lazy `component`, an `explainer: { heading, body }`, a backend `VALID_CALC_TYPES` mirror, and it flows through the save/load/version machinery. Trackers are none of those yet: no component, no saved-data shape, no backend type. Putting them in the registry would force fake values into all of those fields and leak non-calculators into the save flow, the explainer banner, the routing guard, and `backend/calc_types.py`. A separate module keeps the registry's invariant intact — *every registry entry is a real calculator* — and keeps the teasers to exactly the two surfaces that should show them.

**Why a flat module and not a second registry yet:** Teasers need four strings and an icon each; that doesn't justify a registry abstraction. Whether the *real* trackers get their own registry (vs. riding the calculator one, vs. ad-hoc pages) is still an open question — see § "Decisions still to make → Tracker architecture — reuse calculator patterns, or new pattern?". `upcomingFeatures.js` is teaser metadata only; it does not pre-decide that architecture.

**When to revisit:** When the first real tracker is built. At that point the teaser entry for it is replaced by whatever the tracker architecture decision lands on, and this module either grows into that pattern or is retired alongside the last teaser.

## Net Worth Tracker — data model, API, and architecture

**TL;DR:** The first real tracker — a full Wealth module. **Normalised** Postgres tables (`assets`, `liabilities`, `investment_holdings`, `real_estate_properties`) + a `net_worth_snapshots` history table, a `/api/net-worth/*` blueprint with per-resource CRUD + a SQL-aggregated summary, and a tabbed Wealth page with a recharts overview dashboard. **No tracker registry yet.** Ships **auth-gated, not tier-gated**. Modelled on the `fintrackr_dev` Wealth module, adapted to this repo's hard rules.

**Decision (promoted from "Decisions still to make → Tracker architecture" — final as of the v0.10.0 cycle):**

- **Storage — normalised relational tables, not a JSONB blob.** A tracker's value is in querying and aggregating its data (totals, allocation by type, history), which an opaque blob can't do — so net worth gets first-class tables, not a `saved_calculators`-style blob. Five tables, each `user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE` with a `user_id` index, `NUMERIC(14,2)` for money (never `REAL`/float), `TIMESTAMPTZ DEFAULT now()`, and type enums enforced by `CHECK` constraints:
  - `nw_assets` — `asset_type CHECK IN ('cash','brokerage','crypto','pension','custom')`, `name`, `current_value`, `cost_basis`, `notes`. (`custom` = collectibles.)
  - `nw_liabilities` — `liability_type CHECK IN ('credit_card','loan','other')`, `name`, `current_balance`, `interest_rate`, `minimum_payment`, `due_date`, `notes`.
  - `nw_investment_holdings` — `ticker`, `quantity`, `cost_basis`, `current_value`, `asset_class CHECK IN ('stock','etf','crypto','bond','other')`, `region`, `purchase_date`, `notes`.
  - `nw_real_estate` — `property_name`, `property_type CHECK IN ('primary','rental','investment','vacation')`, `current_value`, `purchase_price`, mortgage fields (`mortgage_balance`, `mortgage_interest_rate`, `mortgage_payment`, `mortgage_term_years`), `monthly_rent`, `address`, `notes`. (Mortgages roll up into total liabilities at the summary layer.)
  - `nw_snapshots` — point-in-time history: `snapshot_date DATE`, `total_assets`, `total_liabilities`, `net_worth`, `notes`. Self-contained computed totals, so history survives deleting/editing the underlying rows; powers the net-worth-over-time chart.
  - Tables are prefixed `nw_` to namespace the tracker (the Income & Expense tracker will add its own prefixed set).
- **Type enums are a single source of truth.** The allowed `asset_type` / `liability_type` / `asset_class` / `property_type` values live once in a backend module (e.g. `net_worth_types.py`), imported by both the Marshmallow schema (`OneOf`) and the `db_init.py` `CHECK` constraints — same pattern as `calc_types.py` (§ "Single source of truth for calc types").
- **API — `/api/net-worth/*` blueprint.** A new `backend/routes/net_worth.py` registered in `app.py`, with model + schema modules. Per-resource REST CRUD (`/assets`, `/liabilities`, `/investments`, `/real-estate`), a `GET /net-worth/summary` that aggregates in SQL (`SUM(...) ... GROUP BY asset_type`, mortgage rollup, net worth), and `GET/POST /net-worth/snapshots`. Every route `@login_required`; write routes rate-limited via the shared limiter; **every query carries `AND user_id = %s`** (hard rule #6 — the IDOR boundary, applied to all five tables). Parameterised SQL only (hard rule #7). Follows `PROJECT_STRUCTURE.md` § "Adding a New API Namespace".
- **Frontend — tabbed Wealth page, outside the calculator registry.** A `src/api/netWorthApi.js` built on `createApi()` (hard rule #4 — fintrackr's raw `fetch` is *not* carried over) and a `useNetWorthData` hook. The page mirrors fintrackr's UX: a sticky Net Worth / Assets / Liabilities bar, tabs (Overview / Liquid Assets / Investments / Real Estate / Collectibles / Liabilities) with per-tab counts, per-category CRUD forms+tables, and an **Overview dashboard** — allocation pie, category bar (liabilities negative), global summary with **lifetime gain/loss + % return** (value vs cost basis), category cards (% of total assets), and a snapshot-history line chart. Reuses shared primitives (`NumInput`, `fmt()`); has its own page-level orchestration and a distinct sidebar section — consistent with § "Tracker teasers outside the calculator registry". The teaser entry in `upcomingFeatures.js` is retired when it ships.
- **Charts — `recharts` (already a dependency).** The dashboard (pie + bar + line) is built on `recharts`, which is **already in `package.json`** (`^2.12.7`) and used by ~10 calculators — so the tracker reuses it, no new dependency is added. (The earlier triage call to "add recharts" was made before confirming it was already present; corrected here.) The existing `d3` is Sankey-specific and low-level; recharts is the right tool for standard dashboard charts.
- **No tracker registry yet.** One tracker doesn't justify the abstraction. The first tracker deliberately defines the pattern ad-hoc; whether to extract a shared tracker registry is decided when the **second** tracker (Income & Expense, `v0.11.0`) lands — see § "Decisions still to make → Tracker architecture" (now resolved for tracker #1 only).

**Versioning — hard rule #5 is scoped to opaque client saved-data blobs; normalised tables migrate at the DB layer.** Hard rule #5 ("every saved-data shape has `version: 1` + a migration path in `migrateCalcData.js`") exists because calculator inputs and Sankey permalinks are *opaque serialized blobs* that need on-load migration when their shape changes. The net-worth tables are **not** blobs — they're first-class relational rows with typed columns, like `users` and `saved_calculators`-the-table-itself. They evolve via **idempotent DDL migrations in `db_init.py`** (the existing mechanism — `CREATE TABLE IF NOT EXISTS`, additive `ALTER`s), not a client-side version field. So no `version: 1` blob and no `migrateCalcData` entry for net worth. **This deliberately narrows hard rule #5's "including future trackers" wording** — flagged, not silently routed around (per CLAUDE.md § "Read before structural work"). CLAUDE.md rule #5 is updated in the same change to say so. The rule still binds any *blob* a tracker might serialize (e.g. a saved dashboard layout) — those keep `version: 1`.

**Entitlement — ships free (auth-gated), not tier-gated.** The earlier note (§ "Decisions still to make → Three-layer entitlement enforcement") assumed *"net worth is the first feature with a paid-tier slice."* That predated the 2026-06-21 roadmap resequence, which moved the freemium/tier decision to the **`v0.13.0` product review**, *after* both trackers ship. So Net Worth launches as a free, logged-in-only feature with **no tier gate**. If the product review adopts freemium, a tier slice is retrofitted then via the (still-deferred) `@requires_tier` / `<EntitlementGate>` pattern — the three-layer-entitlement decision is now decoupled from this cycle.

**Launch gating — ships dark behind a feature flag.** The tracker is built production-ready but **hidden in production** until a later waiting-list launch. A single build-time flag, `NET_WORTH_ENABLED` in `frontend/src/featureFlags.js` (env `VITE_NETWORTH_ENABLED`; defaults to `import.meta.env.DEV`, so on under `vite dev`, off in production builds, opt-in on staging), drives the published-tracker surface in `frontend/src/trackers.js` (`LIVE_TRACKERS` / `VISIBLE_UPCOMING`). Every consumer — the `/app/net-worth` route guard (redirects to the coming-soon teaser when off), the calculator-page sidebar, and the in-app landing page — derives from those two lists; nothing re-filters `UPCOMING_FEATURES` itself (the same single-published-surface discipline as the calculator registry, hard rule #3). The backend `/api/net-worth/*` stays available (auth-gated) regardless — only the UI is gated. Flipping the launch (enable in prod + waiting-list capture) is a later cycle, not v0.10.0.

**Credit & adaptation.** The data model and dashboard are modelled on the `fintrackr_dev` Wealth module. Adapted to this repo: Postgres `NUMERIC`/`BIGINT IDENTITY`/`%s` (not SQLite `REAL`/`SERIAL`/`?`), `httpClient.createApi` (not raw `fetch`), centralised type enums, and the `user_id`-on-every-query IDOR rule made explicit across all five tables.

**Why this shape:** It is the most boring choice that satisfies every hard rule. Reusing the `saved_calculators` storage/versioning/IDOR machinery means no new persistence patterns to review; the only genuinely new surface is the time-series page-level UI. Normalised tables and a tracker registry are both real options — they're just deferred to the point where a second tracker proves they're needed, exactly as the open question framed it.

## Income & Expense Tracker — data model, API, and the tracker-registry decision

**TL;DR:** The second tracker. A single normalised `ie_transactions` table (income/expense rows with a typed category), a `/api/income-expense/*` blueprint with a SQL-aggregated monthly/yearly summary, and a page that reuses the Net Worth UI primitives. **No shared "tracker framework" is extracted** — `trackers.js` stays the only shared abstraction. Ships dark behind its own flag. Recurring transactions were added as a post-cycle follow-up (two columns on the row + read-time forecast — see below); budgets remain **deferred**.

**Decision (the v0.11.0 cycle; resolves the open "tracker architecture for tracker #2" question):**

- **Tracker registry — keep it light; do NOT build a tracker framework.** With two trackers now real, the genuinely shared surface is small and already centralised in `frontend/src/trackers.js` (the published-tracker registry: `LIVE_TRACKERS` / `VISIBLE_UPCOMING`, flag-gated). Everything else the trackers "share" is *primitives*, not a framework: `httpClient.createApi`, the `use*Data` hook shape, `CategoryManager` (config-driven form+table), recharts, `NumInput`, `fmt()`. Their **data models and aggregations differ materially** (Net Worth = five resource tables + point-in-time snapshots; Income & Expense = one transaction stream + time-bucketed sums), so a forced shared registry/abstraction over pages, APIs, or hooks would over-couple two things that are only superficially alike. So: each tracker keeps its own page, `api/` module, and hook; they reuse primitives; `trackers.js` remains the single source for nav + routing-gate + ship-dark. **Revisit only if a third tracker appears** and the per-tracker boilerplate actually hurts.
- **Storage — one normalised `ie_transactions` table.** `user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE` (+ index), `type TEXT CHECK IN ('income','expense')`, `category TEXT` (CHECK against a curated set), `amount NUMERIC(14,2) CHECK (amount > 0)` (sign is carried by `type`, not the number), `occurred_on DATE NOT NULL`, `note TEXT`, `recurrence_unit TEXT DEFAULT 'none'` + `recurrence_interval INTEGER DEFAULT 1` (see recurrence decision below), `created_at`/`updated_at TIMESTAMPTZ`. One row per transaction; a unified income+expense stream keeps the summary queries simple. (DDL-migrated, not a `version:1` blob — hard rule #5 is scoped to client blobs, as established for Net Worth.)
- **Categories — curated enums, single-sourced.** `backend/income_expense_types.py` holds `TRANSACTION_TYPES`, `EXPENSE_CATEGORIES`, and `INCOME_CATEGORIES`, imported by the Marshmallow schema (`OneOf`) and the `db_init.py` CHECK — the `calc_types.py` / `net_worth_types.py` pattern. Curated (not free-text) so the by-category breakdown aggregates cleanly. Adding a category is one Python edit + `db_init.py`.
- **API — `/api/income-expense/*`.** Transactions CRUD (list accepts `?year=&month=` filters pushed into SQL, user-scoped), plus `GET /summary` aggregating monthly + yearly income vs expense and spend-by-category in SQL (`SUM(...) ... GROUP BY ...`). All routes `@login_required`; writes CSRF-protected + rate-limited; **every query filters `user_id`** (hard rule #6); parameterised SQL only (#7).
- **Frontend — own page at `/app/income-expenses`** (slug matches the existing teaser, so the coming-soon redirect keeps working when the flag is off): `src/api/incomeExpenseApi.js` + `useIncomeExpenseData`, tabs (Overview / Transactions), a transactions table with month/year + category filters and income-vs-expense styling, and a recharts dashboard (monthly/yearly cashflow + category breakdown). `CategoryManager` backs the add/edit *form*; the filtered list view is tracker-specific.
- **Ships dark.** A second flag, `INCOME_EXPENSE_ENABLED` (`featureFlags.js`, env `VITE_INCOME_EXPENSE_ENABLED`, default `import.meta.env.DEV`), adds the tracker to `trackers.js` `LIVE_TRACKERS` behind the flag — production keeps the "Coming soon" teaser, exactly as Net Worth.

**Recurring transactions (post-v0.11.0 follow-up).** A transaction can repeat. Two decisions:

- **Stored as two columns ON the transaction row, not a separate `recurring_rules` table.** `recurrence_unit TEXT DEFAULT 'none'` (CHECK `IN ('none','day','week','month','year')`) + `recurrence_interval INTEGER DEFAULT 1` (CHECK `>= 1`). A repeat is `(unit, interval)` — `('week', 2)` = every two weeks; this two-column shape expresses the full preset set (daily/weekly/monthly/yearly) *and* custom intervals without a join. A separate rules table would be over-engineered while a transaction *is* the rule's anchor. Added via **idempotent DDL** in `db_init.py` (`ADD COLUMN IF NOT EXISTS` + CHECK rebuild); existing rows default to a one-off (`'none'`, 1) at the DB layer — **no `migrateCalcData` entry / version bump** (hard rule #5 is scoped to opaque client blobs, not this normalised table). The schema normalises a one-off back to interval 1, and the `@post_load` guard is keyed on the field being *present* so a partial `PUT` can't silently reset a recurring row's interval.
- **Forecasts are derived at read time, never persisted.** Projected future occurrences fill the *empty* future months of the selected year as a visually-distinct "forecast" on the cashflow bar chart (`frontend/src/components/income/recurrence.js`). They are computed on the client from the recurrence rule and are **never written as rows** — persisting projections would corrupt the actuals and double-count on the next snapshot of reality. Month/year cadences bucket by month-index arithmetic (so a month-end anchor like Jan 31 never rolls over and skips February); day/week cadences step real dates.
- **Entitlement.** Recurring transactions is a candidate premium feature, but **no tier/entitlement infrastructure exists yet** (Freemium is still in § Future), so it ships open to all. The three-layer gate (UI / route / DB) can wrap it later without restructuring — the rule already lives on a typed column the query layer can filter on.

**Still deferred — budgets.** `fintrackr_dev`'s cashflow module also had per-category `budgets`; those remain out of scope (a separate feature with their own UI surface). Noted in `project.md` § Future.

**Credit & adaptation.** Modelled on the `fintrackr_dev` `cashflow/` module (`MonthlyView`/`YearlyView`/`TransactionForm`/`TransactionTable`/`TransactionFilters`/`SummaryCards`), adapted to this repo's rules exactly as Net Worth was — Postgres types, `httpClient`, centralised enums, `user_id`-on-every-query.

## Single source of truth for calc types (backend)

**TL;DR:** `calc_types.py` is the only place `VALID_CALC_TYPES` is defined.

**Decision:** `calc_types.py` holds `VALID_CALC_TYPES`. Both `schemas/calculator_schema.py` (Marshmallow `OneOf`) and `db_init.py` (CHECK constraint) import from it.
**Why:** Previously these two lists had to be kept in sync manually. Adding a calculator would silently let invalid types into the DB or block valid ones from being saved. Now they can't diverge.
**Trade-off accepted:** `db_init.py` rebuilds the named `calc_type` CHECK constraint via `DROP CONSTRAINT IF EXISTS` + `ADD CONSTRAINT` on every run, so the allowed set always matches `VALID_CALC_TYPES`. Postgres alters constraints in place — the old SQLite full-table-rebuild hack is gone. (The allowed-values list is composed with `psycopg.sql.Literal`, not f-strings, since DDL can't take bind parameters.)

## Shared HTTP client + CSRF injection

**TL;DR:** `createApi(baseUrl)` factory in `httpClient.js`. CSRF handled centrally.

**Decision:** `httpClient.js` exports `createApi(baseUrl)` returning `{ get, post, put, delete }`. `authApi` registers a getter for the CSRF token at module load; `httpClient` calls it on every mutating request and attaches `X-CSRF-Token` automatically.
**Why:** Two API modules used to define their own near-identical `request()` function with CSRF logic copy-pasted. Easy to forget on a third module. The getter-registration pattern keeps the dependency one-way: `httpClient` knows nothing about auth state, `authApi` owns the token.
**Adding a new API namespace** is now one file with one import — see `PROJECT_STRUCTURE.md` § "Adding a New API Namespace".

**Central resilience hooks (same one-way registration pattern).** `httpClient` exposes two more registration points alongside the CSRF-token getter, so reliability is handled once for every API module:
- **Stale-CSRF self-heal (#22):** on a mutating request that 403s with a CSRF error, `httpClient` calls a registered refresher (`authApi.fetchCsrfToken`), then **retries the request once** with the fresh token — so a long-lived tab whose session `csrf_token` expired/evicted self-heals instead of failing every mutation. Retry is capped at one (a persistent 403 surfaces normally). This makes the known "stale CSRF after restart" flake invisible.
- **Central 401 handling (#21):** on a 401 from any **non-auth** endpoint (session expired/cleared server-side), `httpClient` calls a registered handler that `useAuth` wires to reset the user to `null` — so the UI stops showing logged-in and prompts re-auth, instead of every save/load failing with a generic error. Auth-endpoint 401s (a bad login) are excluded — they aren't session expiry. Dependency stays one-way: `httpClient` knows nothing about auth state; `authApi`/`useAuth` register the behaviour.

## Render-error boundary

**TL;DR:** A top-level `ErrorBoundary` (class component) wraps the route tree so one render throw shows a recoverable fallback instead of white-screening the SPA.

**Decision (#23):** `components/ErrorBoundary.jsx` wraps `<Routes>` in `App.jsx`. A render-time exception (a corrupt saved record, a malformed Sankey permalink) is caught (`getDerivedStateFromError` + `componentDidCatch`) and renders a fallback with **Reload** + **Back to calculators** (hard links — a full navigation resets the boundary and any corrupt state, which a client-side route change wouldn't). `<Suspense>` only covers lazy-load pending state, not thrown renders — this is the missing net. No external error-logging service yet; `componentDidCatch` logs to the console.

## CSRF token lives in JS memory, not localStorage

**TL;DR:** Token in a module-level variable in `authApi`. Re-fetched on full reload.

**Decision:** The token is held in a module-level variable inside `authApi`. Fetched on app mount via `authApi.fetchCsrfToken()`. Cleared automatically on full page reload (re-fetched on next mount).
**Why:** Tokens in localStorage are readable by any XSS-injected script. Tokens in HttpOnly cookies are safe but require double-submit patterns. JS-memory storage is the sweet spot: no XSS exposure (a script would need to be inside `authApi`'s module scope), no cookie complexity, automatic invalidation on reload.
**Server-side detail:** `clear_session()` preserves the CSRF token across logout so the next login doesn't fail.

## CSRF on session, not cookie

**TL;DR:** Server-side session-stored token, verified via header.

**Decision:** Backend stores the CSRF token in the server-side Flask session, not in a cookie.
**Why:** With server-side sessions, the token is already protected from client tampering — no need for double-submit cookie patterns. The header-based scheme (`X-CSRF-Token`) is the simpler half of double-submit.

## No ORM — raw SQL via psycopg

**TL;DR:** Raw `psycopg` (psycopg 3) with parameterised queries. SQLAlchemy is not coming.

**Decision:** All DB access uses `psycopg` directly with parameterised (`%s`) queries. (This was `sqlite3` before the Postgres/Neon migration; the no-ORM stance carried over unchanged — only the driver and placeholder style changed.)
**Why:** Two tables, ~10 queries total at MVP. SQLAlchemy would mean a week of refactor for zero correctness or performance gain. Raw SQL is also more transparent about what's actually hitting the database.
**Safety:** Every query against `saved_calculators` includes `AND user_id = %s` — IDOR protection enforced at the query layer, not at a permission layer.
**Stress-test for next phase:** The trackers will add at least two new user-scoped tables (entries, optionally categories). Same rule applies — no query without the user_id filter. If the table count climbs past 6–8, the no-ORM call should be revisited.

## Postgres on Neon

**TL;DR:** SQLite is retired. The app runs on Postgres (Neon), one connection per request, no in-process pool, `data` stored as JSONB.

**Decision:** The database is Postgres, hosted on Neon, accessed via `psycopg` (psycopg 3). A new `db.py` opens one connection per request on Flask `g` and closes it on teardown. `DATABASE_URL` is validated at startup — the app exits if it's missing or not a Postgres URL — with no SQLite fallback and no dual-driver support.

**Why move off SQLite:**
- Render's filesystem is ephemeral, so a SQLite file doesn't survive a deploy or restart — production needs a real, managed database.
- SQLite under multiple gunicorn workers is a correctness/locking hazard; Postgres is built for concurrent writers.
- Neon gives a branch-per-environment workflow: the **dev branch** backs local/staging, the **main branch** backs production. Same engine, isolated data, one env var (`DATABASE_URL`) apart.

**Why no in-process pool:** `DATABASE_URL` points at Neon's **pooled (PgBouncer)** endpoint, which does the pooling. A second pool in-process would just fight it. One connection per request, closed on teardown, is the boring correct choice.

**Why JSONB for `data`:** It's Postgres-native — the engine validates the JSON, can query into it later if needed, and `psycopg` round-trips it directly to/from a Python `dict` (no manual `json.dumps`/`loads`). The route sees the same dict shape it always did.

**No-ORM stance carries over:** see § "No ORM — raw SQL via psycopg". Parameterised `%s` queries, `AND user_id = %s` on every user-scoped query, identity PKs, `TIMESTAMPTZ` timestamps, and an idempotent `db_init.py` (`python db_init.py` still creates/migrates the schema, now Postgres-side).

**When to revisit:** If query volume or table count grows enough that hand-written SQL becomes a maintenance drag (see the no-ORM revisit trigger), or if Neon's pooling model stops fitting (e.g. needing long-lived connections / `LISTEN`/`NOTIFY`), reconsider the per-request-connection shape.

## Schema migrations run on boot

**TL;DR:** `backend/gunicorn.conf.py`'s `on_starting` hook runs the idempotent `db_init.init_db()` in the gunicorn master, before any worker forks — so every deploy self-migrates. The manual `db_init.py` run is now a fallback, not the per-release norm.

**Decision:** Production migrates automatically on each deploy. Gunicorn auto-loads `gunicorn.conf.py` from the start command's working directory (`backend/`, per `DEPLOYMENT.md`), and its `on_starting(server)` hook calls `init_db()` once in the master process before workers fork and before a request is served. The dev runner (`python -m app`) keeps migrating via app.py's `__main__` block. `init_db()` is wrapped in a Postgres advisory lock (`pg_advisory_xact_lock`) so concurrent boots — two workers without `--preload`, or two Render instances — serialise the DDL instead of racing.

**Why this, reversing the prior "manual `db_init.py` per branch" process:** The old process deployed code and ran the migration as *separate* steps — code auto-deploys on merge, but `db_init.py` was a human task run locally against each Neon branch (free-tier Render has no Shell). Forget it, or run it after the deploy, and any write touching a new column 500s in production until someone notices. That gap bit a local DB in dev (v0.11.1's `recurrence_*` columns) and was a standing production hazard. Tying the migration to app boot makes code and schema arrive together, atomically, with no human step.

**Why the gunicorn hook and not `init_db()` inside `create_app()`:** `app:create_app()` is imported by the DB-free unit tests with a dummy, unconnectable `DATABASE_URL` (see § "Test harnesses"). Migrating inside the factory would make every such test open a real connection and fail. The `on_starting` hook only fires under gunicorn, never in tests or bare imports — and running in the master (pre-fork) means the migration happens exactly once per boot, so workers never race even before the advisory lock is considered.

**Failure policy:** if the migration raises, the exception propagates and gunicorn aborts startup — a deploy whose migration failed refuses to serve, and Render keeps the previous version live. Loud failure over a half-migrated database serving requests.

**Scope — additive migrations only.** This is safe for the project's established migration style: additive, idempotent DDL (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, rebuilt CHECKs — see § "Net Worth Tracker" and § "Income & Expense Tracker"). A *destructive* or rewriting change (drop/rename a column, narrow a type, backfill) must **not** ride the boot hook: old workers may still serve during a rolling deploy, and a failed run would block all boots. Those need a deliberate expand/contract migration run out-of-band. When that day comes, this decision is the thing to revisit.

## Redis sessions via Upstash

**TL;DR:** Sessions and rate limiting live in Redis (Upstash) so they hold across workers. Dev can fall back to filesystem sessions + in-memory limiting with one env var unset.

**Decision:** Server-side sessions use `flask-session` with the Redis backend (`SESSION_TYPE = "redis"`, `SESSION_REDIS = redis.from_url(REDIS_URL)`), and the rate limiter stores its counters in the same Redis (`RATELIMIT_STORAGE_URI = REDIS_URL`). In **production**, `REDIS_URL` is mandatory — the app exits at startup without it. In **development**, `REDIS_URL` is optional: set it for full prod parity, or leave it unset to fall back to filesystem sessions + `memory://` rate limiting, with a single clear startup warning.

**Why this replaces "filesystem sessions in dev":** That decision's revisit condition has triggered. Filesystem sessions don't survive across gunicorn worker processes, and Render's filesystem is ephemeral besides — so a multi-worker production deploy needs a shared session store. Likewise, in-memory rate-limit counters are per-process: with `-w 2+` the limits wouldn't actually limit. Redis fixes both with one store.

**Why keep the dev fallback:** A fresh checkout should still run with zero infrastructure. Making `REDIS_URL` optional in dev preserves that — and the gap between "works on my machine" and "works in prod" is exactly one environment variable.

**Upstash specifics:** Upstash connection strings are `rediss://` (TLS). `redis.from_url` negotiates TLS automatically — no extra flags. The CSRF token still lives in the server-side session, so `clear_session()` continuing to preserve the token across logout is unchanged; only the storage backend moved.

**When to revisit:** If Redis becomes a hard dependency for more than sessions + rate limiting (e.g. caching, queues), or if Upstash's per-command pricing model stops fitting the request volume, reassess the provider — not the decision to use Redis.

## Number formatting via shared `fmt()`

**TL;DR:** One `fmt()` in `utils/format.js`. No local copies, ever.

**Decision:** One `fmt()` in `utils/format.js`. Every calculator imports it. No local `fmt()` definitions allowed.
**Why:** Twelve calculators had near-identical local `fmt()` functions before extraction — small variations meant `$1.5K` here and `$1,500` there. Centralising fixes the inconsistency and gives us a single place to add features (currency override, decimal-place override).
**Next phase consideration:** The upcoming i18n / language setting will likely interact with `fmt()` (localised currency symbols, decimal/thousand separators). When that lands, extend `fmt()` — don't add a parallel formatter.

## Numeric input is bounded and clamped at the shared component

**TL;DR:** Every calculator numeric field passes `min`/`max` and `NumInput` clamps on change. The robustness fix lives in shared code (`NumInput` + `fmt` + one `finiteOr` helper); per-calculator work is just passing bounds.

**Decision:** Numeric inputs are made robust to bad input centrally, so all calculators inherit it:
- **`NumInput` clamps on change.** Out-of-range values snap to the bound, non-numeric input is ignored, empty stays empty (calculators read `""` as `0`). Native `min`/`max`/`step` are kept for the spinner and a11y but are *not* relied on — they don't stop typed or pasted values like `8e31` or `-5`, which was the actual failure mode.
- **`fmt()` gained B/T tiers + a `$999T+` display ceiling.** Below `1e9` nothing changes; above it, a legitimately huge finite number (e.g. 50%/yr compounded for 100 years) renders as `$1.00B`/`$2.50T`/`$999T+` instead of a 20-digit `$…M` overflow string.
- **`finiteOr(value, fallback)`** — one shared helper for derived ratios/percentages that bypass `fmt()` (Money Multiplier, Interest %, Coverage %, FIRE savings-rate), so a zero denominator or overflow renders the fallback, never `Infinity`/`NaN`.
- **Chart domains are clamped** (`YAxis domain [0, min(dataMax, 1e15)]`) so a still-large-but-valid input can't produce an unreadable axis.

**Bound ranges chosen:** monetary fields `0…1e9` ($1B — beyond any real personal-finance figure, finite enough to keep arithmetic well-conditioned); rates `0…30–50%` per field (equity return 30, interest/APR 50, HYSA/SWR 20); periods `1…100` (years) / `1…24` (months); savings rate `0…100%`. Debt APR was lowered from `100` to `50` — that ceiling is what removes the reported 316-vs-317 payoff instability (at implausible rates a debt barely amortises, hits the correct 600-month cap, and interest compounds astronomically; a dollar of extra payment flips convergence).

**Why centralised:** One fix in `NumInput`/`fmt`/`finiteOr` hardens all twelve calculators (the eight unpublished ones inherit it for free) and any future calculator, instead of scattering `isFinite`/clamp checks per field. Per-calculator edits are bounds-passing only, not logic rewrites.

**Scope — robustness only.** This phase makes the four published calculators robust to bad input; it deliberately does **not** change financial models. Calculator-model depth is a separate, still-open post-launch track: more FIRE inputs, whether the savings-rate metric is reworked, and whether the avalanche/snowball comparison stays as-is. One known artefact left for that track: a debt whose minimum payment is below its monthly interest negative-amortises to the 600-month cap and shows a large (now `fmt`-bounded, non-overflow) interest figure — real-world-correct, not an input bug, so not silently rewritten here.

**When to revisit:** When the calculator-depth redesign starts (the model-change track above), or if a real user legitimately needs a figure above `1e9` (revisit the monetary ceiling, not the clamp).

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

## `<UserFooter>` shared, rendered once in `AppSidebar`

**TL;DR:** One component, two variants (`compact`, `roomy`). Owns the delete-modal state internally.

**Decision:** The authenticated-user footer block (email, sign-out, delete account modal) is one component with two variants (`compact`, `roomy`). Owns the delete-confirmation modal state internally. As of the shared-sidebar work it renders in exactly one place — `AppSidebar`'s footer (`variant="compact"`).
**Why:** The block was duplicated across two sidebar forks, *and* both owned their own copy of the delete-modal state with identical handlers. Extraction collapsed both; the shared sidebar then collapsed the call site too.

## Shared collapsible sidebar — `AppSidebar` + `AppShell`

**TL;DR:** One sidebar for the calculator landing, every calculator page, and both trackers. Three sibling top-level categories. Collapse state persists across navigation via a module-level boolean — not storage, not Context, not a store.

**Decision:** A single `AppSidebar` (the nav + footer) and `AppShell` (the desktop-slot + mobile-drawer layout, render-prop content) back every `/app` page. It replaced two forks: the old `CalculatorSidebar` and an inline `LandingSidebar` in `LandingPage`. The trackers previously had **no** sidebar at all.
**Structure:** three **sibling** top-level categories, same visual tier — 📊 Calculators (expandable; its calculators render *muted* as sub-items), 📈 Net Worth, 💰 Income & Expenses. The earlier hierarchy nested the trackers under a "Trackers" sub-heading, which read as subordinate. Trackers still ship dark: they appear as top-level siblings only via `LIVE_TRACKERS` (flag-gated), otherwise stay in the muted "Coming soon" section. Calculator sub-items derive from the registry (`PUBLISHED_CALCULATORS`); tracker entries from `trackers.js` — no second list.
**Saved-calcs slot:** the calculator page's saved-calculations list is page-specific data (`useCalculatorData`/`useSave`), so it is *injected* into `AppSidebar` via an optional `children` slot (a function receiving the mobile-drawer `onClose`), rather than pulling that fetch into the shared layout. Trackers pass nothing.
**Collapse persistence — why a module-level boolean (`useSidebarCollapse`):** the requirement is "persist across navigation within a session." Per-component `useState` resets on every route change (each page mounts its own `AppShell`). The DECISIONS prop-drilling rule discourages Context/stores until a prop trail exceeds ~4 levels — this is a *single app-wide UI boolean*, not application state, so a 20-line `useSyncExternalStore`-backed module singleton is the minimum machinery: it survives navigation, needs no provider, and resets on full reload (the intended lifetime). Deliberately **not** `localStorage` (avoids a persisted-preference surface for one ephemeral toggle), and **not** a store library.

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

**Decision:** Per-user favourites stored in `localStorage` keyed by `sm_favourites_${user.id}`.
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
**Storage:** Redis (Upstash) via `REDIS_URL` so counters are shared across workers — see § "Redis sessions via Upstash". In dev, leaving `REDIS_URL` unset falls back to `memory://` (per-process, resets on restart). Multi-process without Redis means the limits don't actually limit.

## Transactional email via Resend

**TL;DR:** Email goes through Resend, wrapped in a `services/email.py` module. It's best-effort — registration never fails because of an email error.

**Decision:** Transactional email is sent via Resend, behind a small `services/email.py` wrapper (`send_email(to, subject, html)` + the concrete `send_welcome_email(to_email)`). `MAIL_FROM` and `RESEND_API_KEY` come from `.env`. If `RESEND_API_KEY` is unset, email is disabled — `send_email` becomes a logged no-op and a single startup warning fires (dev **and** prod). The registration route sends the welcome email **after** the user row is committed, inside its own `try/except` that logs and swallows any failure.

**Why a service module:** Email is a side-effect with its own SDK, config, and failure modes — it doesn't belong inlined in a route. A module gives one place for the SDK wiring, the enabled/disabled gate, and future templates (password reset is the next caller). Routes just call `send_welcome_email(...)` and move on.

**Why registration never fails on email errors:** Account creation and "did the welcome email send" are independent concerns. A Resend outage, a rate limit, or an unverified-domain rejection must not cost a user their signup or even noticeably slow it. So the send happens after the commit, in a guarded block, and its result is ignored. Email is not availability-critical **yet** — that calculus changes when password reset lands (a reset email that silently fails is a real problem), at which point this decision gets a second look.

**Domain caveat:** Until `spreadsheetmillionaire.com` is verified in Resend (a DNS task), sends only succeed to the Resend account owner's own address. That's expected and not a code concern.

## Single-origin deployment via Vercel rewrite proxy

**TL;DR:** Vercel serves the built frontend and rewrites `/api/*` to the Render backend server-side. The browser only ever talks to the Vercel origin, so session cookies stay first-party and there's no CORS surface.

**Decision:** The backend (Flask under gunicorn) runs on **Render**; the built frontend runs on **Vercel** as static files. They live on different domains, but `frontend/vercel.json` rewrites `/api/:path*` to the Render service so the browser never sees the cross-origin hop. Two rewrite rules, order-significant: the API proxy first, then a `/(.*) → /index.html` SPA fallback so hard-refreshing a client route (e.g. `/calculator/fire`) doesn't 404. The frontend keeps calling relative `/api/...` paths — exactly what it already does behind the Vite dev proxy — so **zero `src/` changes** are required.

**Why single-origin instead of direct cross-origin calls:**
- **First-party cookies.** The session cookie is set by, and sent to, the Vercel origin only. Safari (and increasingly others) block third-party cookies outright — a frontend calling `api.onrender.com` directly would have its session cookie dropped. The rewrite keeps the cookie first-party.
- **Zero CORS surface.** Same-origin requests mean no preflight, no `Access-Control-*` juggling, no credentialed-CORS footguns. `CORS_ORIGINS` still exists for defence in depth but isn't load-bearing for the happy path.
- **No frontend rewrite.** Relative `/api` paths already work behind the Vite proxy; the same paths work behind the Vercel proxy. One config file, no code.

**Trade-off accepted:** Every API call hops through Vercel's edge before reaching Render — a small added latency, and Render free-tier **cold starts** (the process sleeps after 15 idle minutes) can exceed the rewrite's timeout on the first request after a sleep. Mitigated by a keepalive pinger hitting `/api/health` every ~10 minutes (see the deployment runbook); the real fix is the $7/mo always-on Render instance at launch.

**When to revisit:** At launch, custom domains make `app.spreadsheetmillionaire.com` and `api.spreadsheetmillionaire.com` **same-site** (shared registrable domain), so first-party cookies survive a direct call. If proxy latency ever measurably matters then, direct API calls become viable — but only after the domains are same-site, never before.

## API proxy target is environment-driven

**TL;DR:** The `/api/*` proxy destination comes from a `BACKEND_ORIGIN` environment variable, read by a Vercel **Edge Middleware** at request time — not from a hardcoded URL in `vercel.json`. Vercel scopes the variable per environment, so the **same code** proxies to the production backend on `main` and to the staging backend on previews.

**Decision:** A zero-dependency Vercel Edge Middleware (`frontend/middleware.js`, matcher `/api/:path*`) reads `process.env.BACKEND_ORIGIN` and rewrites each API request to `${BACKEND_ORIGIN}/api/...`. `vercel.json` keeps only the SPA fallback (`/(.*) → /index.html`); its old static `/api/*` rewrite is gone. The operator sets `BACKEND_ORIGIN` twice in the Vercel project — **Production** scope → the production Render URL, **Preview** scope → the staging Render URL.

**Why the static `vercel.json` rewrite couldn't do it:** A `vercel.json` rewrite `destination` is a literal string baked into the committed config — it **cannot interpolate environment variables**. Because that file travels with the branch, a Preview (staging) deployment and the Production deployment would proxy to the *same* hardcoded backend. With two backends (production on `main`, staging on `develop`), that's wrong by construction: staging frontend would hit the production database, or vice versa. The proxy target has to be resolved per-environment, and only code at the edge can read a per-environment variable.

**Why middleware, not a fetch reverse-proxy edge function:** Both can read `BACKEND_ORIGIN` at the edge and keep it out of the client bundle. The deciding factor is the first-party-cookie path that the single-origin design is built on (see § "Single-origin deployment via Vercel rewrite proxy"). A middleware **rewrite** (setting the `x-middleware-rewrite` header) hands the actual proxying to Vercel's own edge layer — the exact mechanism the old static rewrite used, just with a dynamic destination. Method, body, request headers, and `Set-Cookie` round-trip identically; nothing is hand-rolled. A fetch-based reverse proxy would instead require manually forwarding the request body, fixing the `Host` header, and folding/unfolding multiple `Set-Cookie` headers — the fragile surface single-origin exists to avoid. So middleware preserves proven behaviour; a fetch proxy would re-implement it.

**Why zero-dependency:** `@vercel/edge`'s `rewrite(dest)` helper is a three-line wrapper that sets `x-middleware-rewrite` on an empty `Response`. The middleware sets that header directly, so it needs no new dependency — consistent with the project's deliberately-boring stance (`CLAUDE.md` § "Don't add without explicit approval").

**Why `BACKEND_ORIGIN`, not `VITE_BACKEND_ORIGIN`:** `VITE_`-prefixed variables are inlined into the client bundle at build time. The proxy is server/edge-side — the browser only ever talks to the Vercel origin — so the backend URL must **never** enter client JS. An unprefixed variable is read only by the middleware at request time and stays out of `dist/`.

**How production/preview isolation works now:** Production deployments (`main`) run the middleware with the Production-scoped `BACKEND_ORIGIN` → production Render → Neon main branch. Preview deployments (`develop` and feature branches) run the *same* middleware with the Preview-scoped `BACKEND_ORIGIN` → staging Render → Neon dev branch. Local dev never runs the middleware at all — Vite's dev proxy (`vite.config.js`) still sends `/api` to `localhost:5000`. One codebase, three correct targets, decided entirely by where it's deployed.

**Fail-loud posture:** If `BACKEND_ORIGIN` is unset, the middleware logs an error and returns `502` rather than silently proxying nowhere — matching `config.py` exiting on a missing secret (§ "Config from `.env`, app exits on missing/invalid secret").

**When to revisit:** Same trigger as the single-origin decision — once `app.` and `api.` subdomains are same-site, direct cross-origin API calls become viable and the proxy (and this variable) could be retired. Until then, the env-driven rewrite is how one codebase serves two environments. The current accepted follow-up: the Preview scope is a single value, so *all* previews (every feature branch, not just `develop`) share whatever it points at — staging. Fine for now; if a branch ever needs its own isolated backend, Preview scoping would need to become per-branch.

## gunicorn with 2 workers + ProxyFix

**TL;DR:** Render runs the app under `gunicorn -w 2`, and the WSGI app is wrapped in `ProxyFix` so Flask trusts Render's forwarding headers.

**Decision:** Production serves via `gunicorn --workers 2 --bind 0.0.0.0:$PORT 'app:create_app()'`, run from `backend/`. The app object is exposed as the `create_app()` factory, so the gunicorn target is the factory-call form. Inside `create_app()`, `app.wsgi_app` is wrapped with `ProxyFix(x_for=1, x_proto=1, x_host=1)` — applied unconditionally.

**Why 2 workers:** It's the smallest count that would expose any residual shared-state bug (a session or rate-limit counter living in one worker's memory instead of Redis). Phase 2 moved both to Redis precisely so multi-worker is safe; 2 workers is the cheap proof that it is.

**Why ProxyFix, unconditionally:** Render terminates TLS and forwards requests over HTTP with `X-Forwarded-Proto`/`-For`/`-Host` headers. Without trusting them, `request.is_secure` reports HTTP and Talisman's HTTPS redirect loops forever. Trusting exactly **one** hop (the values are `1`) is correct for Render's single proxy and avoids spoofing from additional untrusted hops. It's harmless in dev behind the Vite proxy (also one hop), so there's no environment branch.

**When to revisit:** If the instance is upsized, raise the worker count (`(2 × cores) + 1` is the usual rule of thumb). If a second proxy layer is ever added in front of Render (e.g. a CDN that also forwards), bump the `ProxyFix` hop counts to match — undercounting trusts a spoofable header, overcounting trusts a hop that isn't there.

## bcrypt + 8-char password rule

**TL;DR:** bcrypt + 8 chars with letter + number. Reasonable floor without being onerous.

**Decision:** bcrypt for hashing, Marshmallow schema enforces 8–72 bytes with at least 1 letter and 1 number.
**Why bcrypt:** Battle-tested, adaptive cost factor, no foot-guns.
**Why the password rule:** Reasonable floor without being onerous. Long enough to defeat trivial brute-forcing combined with rate limiting; lax enough that a real human can remember their password.

**72-byte maximum (#36).** bcrypt silently truncates past 72 bytes, so `validate_password` now also rejects passwords over 72 bytes with a clear 422 — no quiet truncation surprise, and no arbitrarily large password string accepted. The cap lives in the shared `validate_password`, so register / reset / change-password all inherit it (the single-source rule).

## Auth hardening — session rotation + login timing

**TL;DR:** `set_session` rotates the server-side session id on login/register (session-fixation defence, #34); login runs a dummy bcrypt comparison for non-existent accounts so timing doesn't leak account existence (#35).

**Session fixation (#34):** `set_session` (called on login, register, and email-change) now clears the session and assigns a **fresh `session.sid`** before writing auth state, so the signed session cookie changes across the unauthenticated→authenticated boundary — a sid fixed in a victim's browser pre-auth can't carry over. The CSRF token is preserved across the rotation (same as `clear_session`) so the frontend's in-memory token stays valid. Guarded with `hasattr(session, "sid")` so it's a safe no-op on a backend without server-side sids.

**Login timing (#35):** `login` short-circuited when the email didn't exist, skipping the bcrypt comparison — measurably faster, leaking account existence despite the uniform message. It now runs `User.dummy_password_check` (a `bcrypt.checkpw` against a fixed import-time dummy hash) on the not-found path, so both branches cost about the same. Response message/status unchanged; rate limiting (20/hr, 5/min) already bounds the channel.

## Account deletion requires password re-confirmation

**TL;DR:** `DELETE /api/auth/account` checks the password. Cascades via `ON DELETE CASCADE`.

**Decision:** `DELETE /api/auth/account` rejects the request unless the request body contains the user's current password (verified via bcrypt). Cascades via `ON DELETE CASCADE` on `saved_calculators`.
**Why:** Hijacked session shouldn't be able to nuke the account silently. Requiring the password means an attacker would also need the credentials — at which point they could log into a fresh session anyway, but the friction stops casual session-hijack scenarios.
**Next phase note:** The new tracker tables will need `ON DELETE CASCADE` to `users` for the same reason.

## Password reset via hashed single-use tokens

**TL;DR:** A forgotten password is recoverable via an emailed link backed by a hashed, single-use, 60-minute token. The raw token is never stored; the request endpoint never reveals whether an email exists.

**Decision:** `POST /api/auth/forgot-password` issues a reset token; `POST /api/auth/reset-password` consumes it. Tokens live in `password_reset_tokens` (identity PK, `user_id` FK `ON DELETE CASCADE`, `token_hash`, `expires_at`, `used_at`, `created_at`). The raw token is `secrets.token_urlsafe(32)`; only its SHA-256 hex digest is persisted. Lifetime is 60 minutes; consumption stamps `used_at` (single-use); a successful reset also invalidates every other outstanding token for that user. Expired rows are deleted opportunistically on each forgot-password call (no cron).

**Why hash at rest:** The token is a bearer credential — anyone holding it can reset the password. Storing only the digest means a database leak yields hashes, not working links: the raw value exists solely in the emailed link and, transiently, in the request that consumes it. (Same reasoning as not storing plaintext passwords, applied to a short-lived credential.)

**Why 60-minute, single-use:** A reset link is a one-shot action. A short TTL bounds the window in which a leaked link (forwarded email, shared inbox, proxy log) is usable; single-use means a consumed link can't be replayed, and superseding earlier tokens means requesting a new link silently retires the old one.

**Why uniform responses (no enumeration):** `forgot-password` returns one identical `200 {"message": "If that email exists, a reset link has been sent."}` on every path — registered, unregistered, malformed input, or email-send failure. It deliberately has **no `422` validation path** (unlike `register`/`login`), because a differing status on a bad email is itself an enumeration signal. `reset-password` collapses every token problem (unknown / expired / used / missing) into one generic `400 invalid or expired link` with no hint as to which. The cost is slightly less helpful errors; the benefit is that neither endpoint is an account-existence oracle.

**Accepted limitation — timing, not constant-time:** The uniform body is byte-identical, but the endpoint is not perfectly constant-time: a registered email incurs the Resend send latency that a non-existent one doesn't. Flattening that fully would require backgrounding the send (a job queue / thread), which we judged not worth new infrastructure for an endpoint already capped at `3/hour` per IP. This matches `login`'s existing posture (it also short-circuits when the user doesn't exist). The uniform body + tight rate limit are the primary protections; the residual timing side-channel is accepted. Revisit if a cheap background-send path appears.

**Accepted limitation — sessions not force-revoked:** A successful reset updates the bcrypt hash and invalidates outstanding reset tokens, but does **not** revoke already-logged-in sessions elsewhere. Flask sessions live in Redis keyed by session id, not indexed per-user, so there's no efficient "log out all this user's sessions." The password change itself is the protection — an attacker with a live stolen session keeps it until it expires (30 days) or the user logs out, but can no longer re-authenticate. Revisit if per-user session revocation becomes a requirement (it would mean indexing sessions by user id).

**Reuse, not redefinition:** The new-password rules come from the existing `validate_password` in `user_schema.py` (extracted from `RegisterSchema` so there's exactly one copy). `change-email`'s duplicate-email response is byte-identical to `register`'s `409` — matching register's existing enumeration posture rather than inventing a new one.

## Settings as a single stacked page

**TL;DR:** `/settings` is one auth-guarded page with stacked sections, scoped to account management only until tier / i18n land.

**Decision:** `SettingsPage` (`/settings`, guarded by `RequireAuth`) is a single page with stacked sections: account email (read-only), change password, change email (password-confirmed), and a danger zone hosting the existing `DeleteAccountModal`. It reuses `authApi` (no new API namespace) and the existing visual language; entry points are a "Settings" link in `UserFooter` (both variants). Reset/forgot/settings share chrome via an extracted `AuthCardShell`, leaving the high-traffic `AuthForm` (login/register) mechanically untouched.

**Why deliberately minimal:** The product needs account recovery and management to launch; it does not yet need preferences. Language/i18n, currency, tier display, and email-verification-on-change are explicitly out of scope this phase — they depend on systems that don't exist yet (the i18n integration, the tier/entitlement model). Building the page now as a plain stack of forms means adding those later is appending a section, not a redesign.

**When to revisit:** When tier or i18n ships, the page gains a section (or splits into tabs if the count grows past ~5). Email verification on change is the most likely near-term addition — when it lands, `change-email` becomes a two-step confirm-then-apply flow rather than the immediate update it is now.

## Security headers via Flask-Talisman

**TL;DR:** HTTPS in prod, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, strict `Referrer-Policy`.

**Decision:** Talisman enabled in `app.py`. Forces HTTPS in production, sets `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and a strict `Referrer-Policy`.
**Why:** Defence in depth. Each header blocks a specific attack class — clickjacking, MIME confusion, referrer leakage. Cheap to add, hard to remember to add later.

**Frontend headers on Vercel — the document the browser loads (#19).** Talisman only covers `/api/*` responses from Render; the HTML/JS/CSS is served by Vercel, which had no header config — so the document itself was framable and had no CSP. `frontend/vercel.json` now carries a `headers` block on `/(.*)` with `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, HSTS, and a **strict Content-Security-Policy**: `default-src 'self'`, `script-src 'self'` (no inline/eval — the production Vite bundle is a single external module script), `style-src 'self' 'unsafe-inline'` (Recharts/React set inline `style` attributes), `img-src 'self' data:`, `connect-src 'self'` (the API is same-origin via the edge proxy), `frame-ancestors 'none'`, `object-src 'none'`, `base-uri`/`form-action 'self'`. The app loads **no external resources** (no CDN/fonts), so the CSP can stay strict. This is the CSP backstop § "CSRF token lives in JS memory" relied on but never had.

## Bounded request payloads + write rate limits

**TL;DR:** `MAX_CONTENT_LENGTH` (256 KB) rejects oversized bodies with 413 before parsing; the saved-calculator `data` blob is capped (64 KB serialized + depth/node bounds → 422); calculator write routes carry per-user rate limits.

**Decision (#20):** `Config.MAX_CONTENT_LENGTH = 256 * 1024` bounds every request body at the Werkzeug layer. The opaque `data` dict (stored as JSONB) is validated by `_bounded_calc_data` in `calculator_schema.py` — JSON-serialisable, ≤ 64 KB serialized, ≤ 24 deep, ≤ 1000 nodes — giving a precise 422 instead of accepting an arbitrary dict. `routes/calculators.py` create/update get `@limiter.limit("60 per minute")`, delete `"120 per minute"`. **Why:** `data` was `fields.Dict()` with no bound — an authenticated user could bloat storage/memory and any client could send oversized bodies to any route. The caps are far above legitimate calculator inputs (a few KB).

## Config from `.env`, app exits on missing/invalid secret

**TL;DR:** Loud failure beats silent fragility.

**Decision:** All sensitive values in `.env`. `config.py` reads them via `python-dotenv`. App exits at startup if `FLASK_SECRET_KEY` is missing, under 32 chars, or still the placeholder.
**Why:** Loud failure beats silent fragility. A misconfigured production server should refuse to boot rather than run with a weak key.

## Test harnesses — pytest (backend) + vitest (frontend)

**TL;DR:** pytest via the `create_app()` factory with a *forced* hermetic env; vitest via a `test` block in `vite.config.js`. DB-backed tests use a throwaway Postgres + TRUNCATE between tests, gated on `TEST_DATABASE_URL`.

**Decision:**
- **Backend:** plain `pytest` (no `pytest-flask`), building the app from the real `app:create_app()` factory. Test deps live in `backend/requirements-dev.txt` (`-r requirements.txt` + pytest); config in `backend/pytest.ini` (`testpaths = tests`). Fixtures in `backend/tests/conftest.py`: `app` (TESTING + `RATELIMIT_ENABLED=False`), `client` (anonymous), `get_csrf_token` helper, and `db`/`auth_client` for DB-backed tests.
- **Frontend:** `vitest` + `jsdom`, configured in the `test` block of `vite.config.js` (no separate `vitest.config.js`). `npm test` → `vitest run`. Component tests use `@testing-library/react` + `@testing-library/jest-dom`, wired via `test.setupFiles` → `src/setupTests.js` (jest-dom matchers + a `ResizeObserver` stub so recharts renders in jsdom).

**Why these specifics:**
- **conftest *forces* the test env before importing the app (not `setdefault`).** `config.py` validates `FLASK_SECRET_KEY`/`DATABASE_URL` at import time and `sys.exit(1)`s without them, so the env must be set before the first app import. Forcing (overwriting) the infra vars — dummy `DATABASE_URL`, blank `REDIS_URL`/`RESEND_API_KEY`, `FLASK_ENV=development` — guarantees a test run can **never** reach the production database, Redis, or email provider even if a real `.env`/shell env is present. `development` also disables Talisman's HTTPS redirect and makes Redis optional (filesystem sessions).
- **DB isolation is TRUNCATE-between-tests against a throwaway Postgres, not transactional rollback.** The models do `from db import get_db` and each request opens its own connection (no in-process pool — see § "No ORM — raw SQL via psycopg" and § "Postgres on Neon"). A rollback held on a separate test connection would never see the app's writes, and monkeypatching `db.get_db` wouldn't reach the names already bound in the model modules. Truncating `users`, `saved_calculators`, `password_reset_tokens` after each test is import-style-independent and obviously correct.
- **DB tests skip without `TEST_DATABASE_URL`.** The DB-free majority (incl. the `/api/health` smoke test) needs no infrastructure, so a bare `cd backend && pytest` is green on any checkout. DB-backed suites (auth, IDOR, saved-data) opt in by pointing `TEST_DATABASE_URL` at a disposable database — wired into CI by the CI workflow.

**When to revisit:** if test count/runtime grows enough to want per-test transactional isolation, switch the app to a request-scoped connection that tests can inject (then rollback becomes viable). *(Done 2026-06-21: `@testing-library/react` added for component tests — the Net Worth tracker (manager forms, dashboard, page) was the first UI needing coverage beyond pure utils.)*

## Linting & formatting — ESLint 9 (flat) + Prettier

**TL;DR:** ESLint 9 flat config (`frontend/eslint.config.js`) with React + hooks rules and a custom no-raw-fetch guard; Prettier for formatting. `npm run lint` runs in CI via the existing `--if-present` step.

**Decision:**
- **ESLint 9 flat config** (`eslint.config.js`), pinned to the **9.x** line — `eslint-plugin-react` doesn't yet support ESLint 10. Rules: `@eslint/js` recommended + `eslint-plugin-react` (flat recommended + jsx-runtime, so no `React` import needed) + `react-hooks` (`rules-of-hooks: error`, `exhaustive-deps: warn`) + `react-refresh`.
- **Custom guard for CLAUDE.md Hard Rule #4:** `no-restricted-globals` bans `fetch` in `src/**` except `src/api/**`, so raw HTTP outside the `httpClient` layer fails lint (CSRF injection lives there).
- **`react/no-unescaped-entities` is off** — it only flags apostrophes/quotes in prose (legal + marketing pages), which render fine; escaping dozens of them hurts readability. Cosmetic, not correctness.
- **`no-unused-vars` uses `ignoreRestSiblings: true`** so the `const { omit, ...rest } = obj` field-strip idiom (migrateCalcData) isn't a false positive.
- **Prettier** config (`.prettierrc.json`): single quotes, no semicolons, 100 cols — matches the existing style. Available via `npm run format`; **not** wired into CI as a gate (would force a repo-wide reformat) — `eslint-config-prettier` just disables ESLint's stylistic rules so the two don't fight.
- **Lint is not `--max-warnings 0`:** `eslint .` exits 0 on warnings, so the two intentional `exhaustive-deps` omissions in `useSave.js` don't block CI while staying visible.

**Notable catch:** turning on `rules-of-hooks` surfaced a real latent bug in `CalculatorPage.jsx` — an early `return <Navigate>` for unpublished/unknown types sat *before* 10 hooks, so a same-instance re-render into that state would crash React ("rendered fewer hooks than expected"). Fixed by running every hook unconditionally and returning the redirect afterward (with a `CALC_MAP[type] ?? {}` guard for unknown types). Exactly the class of bug the lint baseline exists to prevent.

**When to revisit:** add `--max-warnings 0` once the `exhaustive-deps` warnings are resolved; wire `format:check` into CI once the codebase is fully Prettier-formatted.

## Git branching model

**TL;DR:** `main` ← `develop` ← `feature/*`, conventional commits, squash merge, tags on releases.

**Decision:** Three-tier branching: `main` is production, `develop` is staging/integration, and `feature/*` branches cut from `develop` and merge back via a squash-merged PR. Commits follow Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`) — one logical change each. A release is a PR from `develop` to `main` followed by a version tag (`v0.2.0`, …). The original prototype is preserved at the `v0.1.0-prototype` tag.

**Why this shape:**
- Solo dev deliberately learning a production-grade workflow before there are users or collaborators forcing it. Practising the discipline now makes adding a second contributor a non-event rather than a process retrofit.
- Squash merge keeps `main`'s history one-commit-per-feature and readable; the messy in-progress commits stay on the feature branch.
- The `develop` tier is a place to integrate and verify several features together before they reach production — and a natural target for per-branch preview deploys (Vercel) once that lands.
- Tags make every release — and the prototype — recoverable by name.

**Repo-settings caveat:** Squash-only merge settings and branch protection on `main` are configured through GitHub's API/UI, not in the repo. On a private repo with a limited token (or a free plan), those server-side rules may not be enforceable. Until they are, the workflow is upheld by discipline, not by GitHub blocking a bad push — which is acceptable for a solo dev and revisited the moment that changes.

**When to revisit:** If a second contributor joins, tighten enforcement (required reviews, status checks). If `develop` stops earning its keep — features shipping straight to `main` without an integration step — collapse to trunk-based development with short-lived feature branches.

## Marketing landing page — same Vite app, route at `/`

**TL;DR:** The marketing landing lives in the existing Vite SPA at `/`; the app moved under `/app/*`. No separate static site.

**Decision:** Promoted from "Decisions still to make" and made final in Phase 6. The public marketing page is a route (`/`) in the same Vite/React app, alongside `/privacy` and `/terms`; the entire in-app surface moved under `/app/*` with param-preserving redirects from the old top-level paths. Marketing section components live in `frontend/src/marketing/` (parallel to `calculators/`); the page itself is `pages/MarketingLandingPage.jsx`.

**Why same app, not a separate Astro/Next site:**
- **One deploy, one origin.** The Vercel single-origin rewrite (see § "Single-origin deployment") already serves the SPA and proxies `/api/*`. A second site would mean a second deploy, a second origin, and either a shared-cookie story or a redirect dance. Not worth it for a handful of static sections.
- **Shared auth + session.** The nav adapts to auth state using the same prop-drilled `auth` object the app uses; "Open app" vs "Sign in / Get started" needs no new machinery.
- **Shared design tokens.** Marketing and app draw from the same Tailwind config, so the brand (amber accent, dark base, the `SpreadsheetMillionaire` wordmark) stays consistent across the click-through.

**Design note — visual language defined here, font deferred.** Phase 6 establishes the public visual language on a `stone-950` base with a single amber accent. The product currently ships a `system-ui` font stack (no DM font in `tailwind.config.js`), so the literal "DM font family" direction was **deferred to the later app-wide design refresh** rather than introduced as a marketing-only divergence — adding a webfont to marketing alone would have made the click-through *less* consistent, not more. The refresh is the right place to adopt a brand typeface app-wide, if it adopts one at all.

**When to revisit:** If the marketing page grows real CMS needs (non-developers editing copy) or organic search becomes a channel that SSR/prerender would materially help (see § "SPA SEO limitation accepted"), splitting marketing out to a static generator becomes worth the second deploy. Until then, one app is correct.

## SPA SEO limitation accepted

**TL;DR:** The marketing page is client-rendered. We accept the SEO ceiling that comes with that, and don't add SSR/prerender/helmet to paper over it.

**Decision:** SEO for the marketing surface is limited to what a client-rendered SPA can do: a static `<title>` + meta description + Open Graph/Twitter tags in `index.html`, plus a `useDocumentTitle` hook giving each route a distinct title. No server-side rendering, no prerender/SSG step, and no `react-helmet` (a dependency for what two `<head>` tags and one hook already cover).

**Why accept it:** The product's traffic isn't organic-search-led today — it comes from build-in-public channels (the GitHub repo, direct shares). JS-executing crawlers (Googlebot) do pick up the per-route titles. The cost of "proper" SEO — SSR or a static generator — is a second rendering path or a second site, which is real complexity for a channel that isn't yet load-bearing.

**When to revisit:** If organic search becomes a channel we actually want to compete in, the marketing page (and only the marketing page) moves to a static generator or gains a prerender step. That's the trigger; until it fires, the SPA approach is intentional, not an oversight.

## Marketing page invents nothing

**TL;DR:** Everything on the marketing page must be true of the product today. No fabricated social proof, ever.

**Decision:** A standing constraint on all marketing copy and UI: no testimonials, no user/download counts, no "as seen in" or partner logos, no stock-photo people, no claims that aren't verifiable against the current product. The calculator showcase derives from `PUBLISHED_CALCULATORS` and the coming-soon strip from `UPCOMING_FEATURES` — real features, never a hand-curated highlight reel. "Free while in beta" is the honest framing for the not-yet-existent pricing story; a `/pricing` page waits until a paid tier actually exists.

**Why:** A build-in-public product's credibility *is* its honesty — and the genuinely public GitHub repo means any fabrication is trivially falsifiable. Invented social proof is both an integrity problem and a liability the moment a visitor checks. The authentic signals (open source, usable with no signup, no ads/no data sale) are stronger than manufactured ones anyway.

**When to revisit:** Never as a relaxation. When real proof exists (actual testimonials with permission, real metrics worth citing), it can be added *because it's true* — the constraint is "nothing fabricated," not "nothing persuasive."

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
**Decide before:** The first tier-gated feature ships. ~~Net worth tracker~~ — the 2026-06-21 resequence moved the freemium/tier decision to the `v0.13.0` product review, *after* both trackers ship, so Net Worth (`v0.10.0`) launches free/auth-gated and is no longer the forcing function. See § "Net Worth Tracker — data model, API, and architecture" → Entitlement.

### Tracker architecture — reuse calculator patterns, or new pattern?

**Resolved.** Tracker #1 (`v0.10.0`, see § "Net Worth Tracker"): shared primitives, ad-hoc pages, outside the calculator registry. Tracker #2 (`v0.11.0`, see § "Income & Expense Tracker — data model, API, and the tracker-registry decision"): **no shared tracker framework is extracted** — the trackers reuse UI primitives and keep `trackers.js` as the only shared abstraction (the published-tracker registry); per-tracker page/api/hook stay separate because their data models differ materially. Revisit only if a third tracker makes the per-tracker boilerplate hurt.

### i18n — when, how, and how deeply

**The question:** Language as a user setting means at minimum a translation table for all UI strings. At maximum, it means localised currency formatting, dates, and number conventions throughout.
**Initial leaning:** Use `react-i18next` for strings; extend `fmt()` for currency/number locale. Tackle as part of the design refresh, not as a separate pass.

### Design system extraction

**The question:** The visual refresh will touch every component. Whether to extract a `<Card>`, `<Button`, `<Section>` primitive layer first, or refresh in place, is open.
**Initial leaning:** Refresh in place for two or three components first to see what the new visual language actually looks like, *then* extract primitives once the patterns are visible. Premature abstraction here is worse than duplication.
