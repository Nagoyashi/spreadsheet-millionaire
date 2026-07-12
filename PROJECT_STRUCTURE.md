# SpreadsheetMillionaire — Project Structure

> Keep this file updated whenever files are added, moved, or deleted.
> Claude reads this first to resolve import paths and file locations.

---

## Repository Root

```
money-calculators/
├── .gitignore
├── .github/
│   └── workflows/
│       ├── ci.yml              # CI on PRs/pushes to develop+main: frontend (lint/test/build) + backend (compile/pytest w/ Postgres service/rule-1)
│       └── release.yml         # Tag-triggered GitHub Release publisher (docs/releases/vX.Y.Z.md → Release; closes the milestone)
├── README.md                   # Quickstart, local dev, env vars
├── STATUS.md                   # Technical reference — stack, providers, architecture, data model, API docs
├── PROJECT_STRUCTURE.md        # This file — canonical tree, route map, conventions
├── DECISIONS.md                # The *why* behind every architectural choice
├── CLAUDE.md                   # Hard rules + working style for AI assistants
├── docs/
│   ├── DEPLOYMENT.md           # Staging deploy runbook — Render + Vercel, env tables, smoke test
│   └── tasks/                  # Phase task prompts (phase-1, phase-2, phase-3, …)
├── backend/
└── frontend/
```

---

## Backend

```
backend/
├── .env                        # Secret key + Neon/Upstash/Resend config — never committed
├── requirements.txt            # flask, flask-cors, flask-session, flask-limiter, flask-talisman, bcrypt, marshmallow, python-dotenv, psycopg, redis, resend, gunicorn
├── requirements-dev.txt        # Test deps (pytest) — pulls in requirements.txt; never installed in prod
├── pytest.ini                  # pytest config — testpaths=tests; run as `cd backend && pytest`
├── app.py                      # Flask app factory — structured logging + Sentry init (DSN-gated), ProxyFix, db teardown, limiter + Talisman, startup warnings, per-request logging hooks
├── config.py                   # All config read from .env — exits if SECRET_KEY/DATABASE_URL invalid (and REDIS_URL in prod)
├── logging_config.py           # Structured request logging (stdlib) — configure_logging() (JSON in prod / plain in dev) + install_request_logging() (request id, timing, status→level, X-Request-ID header, skips /api/health). DECISIONS.md § "Structured request logging"
├── calc_types.py               # Single source of truth for VALID_CALC_TYPES (imported by schema + db_init)
├── net_worth_types.py          # Single source of truth for Net Worth enum sets (ASSET_TYPES/LIABILITY_TYPES/ASSET_CLASSES/PROPERTY_TYPES) — imported by nw schema + db_init
├── income_expense_types.py     # Single source of truth for Income & Expense enums (TRANSACTION_TYPES/EXPENSE_CATEGORIES/INCOME_CATEGORIES/ALL_CATEGORIES/RECURRENCE_UNITS) — imported by ie schema + db_init
├── user_tiers.py               # Single source of truth for account tiers (USER_TIERS = free/pro/elite, DEFAULT_TIER) — imported by admin route + db_init (users.tier CHECK)
├── publishable.py              # The toggleable surface = VALID_CALC_TYPES + TRACKER_TYPES (net-worth, income-expenses). Seeds calculator_publish (trackers default unpublished); admin publish route validates against it
├── db.py                       # Per-request psycopg connection on Flask g, closed on teardown (no in-process pool)
├── db_init.py                  # Postgres schema creation + idempotent CHECK-constraint rebuild (users [+is_admin/tier/suspended/last_login_at], saved_calculators, password_reset_tokens, nw_* Net Worth tables, ie_transactions, calculator_publish [seeded from DEFAULT_PUBLISHED_TYPES], admin_audit_log); advisory-locked so concurrent boots serialise
├── gunicorn.conf.py            # Auto-loaded by gunicorn (run from backend/) — on_starting hook runs db_init once in the master before workers fork, so every deploy self-migrates (DECISIONS.md § "Schema migrations run on boot")
├── __pycache__/
├── venv/                       # Python virtual environment — never committed
├── models/
│   ├── user.py                 # User model — bcrypt hashing, create/get, update_password/update_email, set_admin; admin Users screen: list_for_admin/tier_counts/set_tier/set_suspended/touch_last_login. NO delete — deletion is services/account_deletion.py (#179)
│   ├── calculator.py           # SavedCalculator model — all queries include AND user_id = %s
│   ├── calculator_publish.py   # Runtime publish-state access (global, not user-scoped) — list_all/published_types/set_published; admin portal writes it, public /app reads it
│   ├── admin_audit.py          # Append-only admin audit trail — record(admin_id, action, target_user_id, detail JSONB); written on tier/suspend changes
│   ├── net_worth.py            # Net Worth data-access — generic NetWorthTable CRUD (assets/liabilities/investments/real-estate) + SQL summary + snapshots; all queries filter user_id
│   ├── income_expense.py       # Income & Expense data-access — ie_transactions CRUD (year/month filters) + SQL monthly/yearly summary; all queries filter user_id
│   └── password_reset.py       # PasswordResetToken model — stores only the SHA-256 hash; create/find-valid-by-hash/mark-used/invalidate-all-for-user/delete-expired
├── routes/
│   ├── auth.py                 # /api/auth/* — register (+welcome email), login, logout, status, delete account, GET account/export (download-my-data JSON attachment, #180), csrf-token, forgot-password, reset-password, change-password, change-email
│   ├── calculators.py          # /api/calculators/* — CRUD for saved calculations + GET /published (public runtime publish surface)
│   ├── admin.py                # /api/admin/* — admin-only (admin_required, 404 for non-admins). Overview: GET /calculators, PATCH /calculators/:type {published} (calcs + trackers). Users: GET /users (search/tier), PATCH /users/:id {tier?,suspended?}, PATCH /users/:id/admin {is_admin} (superadmin_required). Support (#182): GET /users/:id/export (attachment) + DELETE /users/:id (via account_deletion; guards: not self / never superadmin / admins only by superadmin) — all audit-logged. Analytics: GET /analytics?range= (DB signups + GA4 proxy + PostHog funnel)
│   ├── net_worth.py            # /api/net-worth/* — CRUD for assets/liabilities/investments/real-estate + /summary + /snapshots (login_required, CSRF, rate-limited writes)
│   ├── income_expense.py       # /api/income-expense/* — transactions CRUD (year/month filters) + /summary (login_required, CSRF, rate-limited writes)
│   └── health.py               # GET /api/health — dumb liveness probe (no DB/Redis) · GET /api/health/ready — readiness probe (SELECT 1 → 200 / 503 degraded) for external uptime monitoring; both rate-limit exempt. DECISIONS.md § "Liveness vs readiness health probes"
├── schemas/
│   ├── user_schema.py          # Shared validate_password (8+ chars, 1 letter, 1 number) + Register/Login/ResetPassword/ChangePassword/ChangeEmail schemas
│   ├── calculator_schema.py    # Imports VALID_CALC_TYPES from calc_types.py
│   ├── net_worth_schema.py     # Asset/Liability/Investment/RealEstate/Snapshot schemas — enums from net_worth_types.py
│   └── income_expense_schema.py # TransactionSchema — enums from income_expense_types.py; per-type category validation
├── services/
│   ├── account_deletion.py     # The single account-deletion path (#179) — USER_SCOPED_TABLES registry (8 tables), delete_account() (count → delete → verify-empty → commit; CascadeIntegrityError + rollback on survivors), verify_cascade_coverage() drift guard. DECISIONS.md § "Account deletion — explicit, verified cascade"
│   ├── data_export.py          # Download-my-data (#180) — export_account() dumps account + every USER_SCOPED_TABLES row as plain JSON (secrets stripped: password_hash, token_hash); table list derived from the deletion registry
│   ├── email.py                # Resend wrapper — send_email + send_welcome_email + send_password_reset_email; disabled (no-op) without RESEND_API_KEY
│   ├── analytics.py            # Admin Analytics assembler — DB signups/funnel (always) + GA4 traffic proxy (optional) + PostHog activation funnel/top-calculators (optional, #178); per-vendor empty-state
│   └── posthog_analytics.py    # PostHog read-back (#178) — HogQL Query API via stdlib urllib, personal API key (secret, server-side); fetch()=activation_funnel + top_calculators; PostHogError on failure
├── utils/
│   └── auth_helpers.py         # login_required, admin_required (404 for non-admins), csrf_protect, set/clear session, generate_csrf_token
└── tests/
    ├── conftest.py             # Hermetic test env (forced before import) + app/client/get_csrf_token fixtures; db/auth_client skip without TEST_DATABASE_URL
    ├── test_health.py          # /api/health liveness smoke test + /api/health/ready readiness (DB-up 200 needs TEST_DATABASE_URL; DB-down 503 + failure-logging via monkeypatch, no DB)
    ├── test_db_smoke.py        # DB-path wiring proof (register + truncation isolation); skips without TEST_DATABASE_URL, runs in CI
    ├── test_migrations.py      # db_init contract (#184) — idempotent re-run preserves data, older schema migrates forward (dropped columns re-added w/ defaults), CHECKs rebuild from Python source, publish seeding backfills but never resets admin toggles; DB-backed
    ├── test_auth.py            # End-to-end auth-flow tests (register/login/logout/forgot+reset/delete/change-pw/change-email); email mocked, DB-backed
    ├── test_idor.py            # Tenant-isolation tests for saved_calculators (Hard Rule #6) — route + model layer, two users, unauth 401
    ├── test_admin.py           # Admin gate (401/404) + publish toggle + public /published surface + Analytics (GA4/PostHog empty-state, PostHog funnel when configured, posthog_error labelling) + support tools (#182: export audit, delete + guards); DB-backed
    ├── test_posthog_analytics.py # PostHog read-back unit tests (#178) — fetch() shaping, HTTP-error → PostHogError; DB-free (urllib mocked)
    ├── test_account_deletion.py # Cascade contract (#179) — seeds every USER_SCOPED_TABLE for two users, full wipe + bystander isolation + erasure report + drift guard + route-uses-service spy; DB-backed
    ├── test_data_export.py     # Export contract (#180) — every registry table present, bystander excluded, secrets stripped, values JSON-plain, route auth + attachment header; DB-backed
    ├── test_calculators.py     # Saved-calculator write bounds (#20) — MAX_CONTENT_LENGTH 413, data field cap 422, no row on reject
    ├── test_sentry.py          # Sentry backend guard — DSN gate (no init without DSN) + privacy defaults; no DB
    └── test_request_logging.py # Structured request logging (#175) — request-id header, structured fields, status→level, /api/health skip, JSON formatter; no DB
```

### Backend .env variables

The canonical env-var reference (dev vs prod values, generation, and config
nuances) lives in `README.md` § "Environment variables". `backend/.env` is
git-ignored — never commit it.

---

## Frontend

```
frontend/
├── index.html
├── package.json
├── vite.config.js              # Proxies /api/* → localhost:5000 (local dev only); `test` block sets the vitest jsdom env. `npm test` = vitest run
├── vercel.json                 # SPA fallback (/(.*) → /index.html) + security headers block (CSP, X-Frame-Options DENY, nosniff, Referrer-Policy, HSTS) on document/asset routes. The /api/* proxy is in middleware.js
├── middleware.js               # Vercel Edge Middleware — env-driven /api/* proxy. Reads BACKEND_ORIGIN at the edge, rewrites to ${BACKEND_ORIGIN}/api/*. NOT in the client bundle
├── tailwind.config.js
├── postcss.config.js
├── eslint.config.js            # ESLint 9 flat config — React + hooks rules; bans raw fetch outside src/api/ (Hard Rule #4). `npm run lint`
├── .prettierrc.json            # Prettier formatting (single quotes, no semicolons, 100 cols). `npm run format`
├── .prettierignore             # dist, node_modules, package-lock.json
└── src/
    ├── App.jsx                 # BrowserRouter + full route map. Marketing at / (+ /privacy, /terms); app namespaced under /app/*; RequireGuest (login/register) + RequireAuth (/app/settings) wrappers; param-preserving redirects from old top-level app paths. See "Route map" below
    ├── main.jsx                # React root mount — calls initSentry(), then initPostHog() + analytics.trackSession(), before render
    ├── sentry.js               # Sentry (@sentry/react) init + Sentry re-export — DSN-gated on VITE_SENTRY_DSN, no PII/replay/tracing (DECISIONS.md § "Error monitoring via Sentry (frontend)")
    ├── sentry.test.js          # vitest — initSentry() no-ops without a DSN
    ├── posthog.js              # PostHog (posthog-js) init + re-export — key-gated on VITE_POSTHOG_KEY, EU cloud, autocapture/replay/pageview OFF (DECISIONS.md § "Product analytics via PostHog (EU cloud)")
    ├── posthog.test.js         # vitest — initPostHog() no-ops without a key
    ├── index.css               # Tailwind directives + base styles
    ├── constants.js            # Shared storage key generators (CALC_STORAGE_KEY, FAVOURITES_KEY, ANALYTICS_SESSION_KEY, ANALYTICS_ONCE_KEY)
    ├── upcomingFeatures.js     # UPCOMING_FEATURES tracker teasers (Net Worth, Income/Expense) — deliberately NOT in the calculator registry; raw source for trackers.js
    ├── setupTests.js           # vitest setup — jest-dom matchers + a ResizeObserver stub (for recharts in jsdom); wired via vite.config test.setupFiles
    ├── trackers.js             # Published-tracker surface: useLiveTrackers() + useVisibleUpcoming() — runtime hooks over usePublishedTypes (DB-backed publish), replacing the deleted build-time featureFlags.js. Every nav/grid consumer derives from these, never re-filters UPCOMING_FEATURES
    ├── api/
    │   ├── httpClient.js       # Shared fetch wrapper. createApi(baseUrl) + central CSRF injection, stale-CSRF 403 retry (#22), and 401→onUnauthorized hook (#21)
    │   ├── httpClient.test.js  # vitest — CSRF-403 self-heal retry + central 401 handling
    │   ├── analytics.js        # PostHog activation-funnel instrumentation (#177) — one helper per event (calculatorUsed/accountCreated/trackerFirstEntry/secondSession/upgradeViewed/upgradeClicked) + identify/reset/trackSession; no-ops until posthog loads (DECISIONS.md § "Product analytics via PostHog (EU cloud)")
    │   ├── analytics.test.js   # vitest — funnel events, one-shot tracker_first_entry, second_session session-counter
    │   ├── authApi.js          # register / login / logout / deleteAccount / getStatus / fetchCsrfToken / forgotPassword / resetPassword / changePassword / changeEmail
    │   ├── calculatorApi.js    # getPublished (public runtime publish surface) / getAll / create / update / remove
    │   ├── adminApi.js         # /api/admin/* — getCalculators / setPublished / getUsers / updateUser / setUserAdmin (superadmin) / deleteUser (#182) / getAnalytics
    │   ├── adminApi.test.js    # vitest — admin endpoint verb + path + body wiring
    │   ├── netWorthApi.js      # /api/net-worth/* — assets/liabilities/investments/realEstate CRUD + getSummary + snapshots
    │   ├── incomeExpenseApi.js # /api/income-expense/* — transactions CRUD (year/month filters) + getSummary
    │   └── netWorthApi.test.js # vitest — asserts each endpoint's verb + path + body wiring
    ├── utils/
    │   ├── format.js           # Shared fmt() — replaces 12 local copies, supports custom currency
    │   ├── format.test.js      # vitest unit tests for fmt() (compact ladder, currency, display ceiling)
    │   ├── migrateCalcData.js  # migrate() / stripVersion() / injectVersion() — saved-data versioning
    │   └── migrateCalcData.test.js # vitest unit tests for the migration engine (sankey v1→v2, idempotency, version guards)
    ├── calculators/
    │   ├── registry.js                     # ← ONLY file to touch when adding a calculator. Exports CALCULATORS/CALC_MAP/VALID_TYPES + DEFAULT_PUBLISHED_* (build-time fallback for the runtime publish surface)
    │   ├── usePublished.js                 # Runtime publish surface — usePublishedTypes/usePublishedCalculators (reads GET /api/calculators/published; module-store, no Context); registry defaults as fallback. invalidatePublished() after an admin toggle
    │   ├── usePublished.test.js            # vitest — fallback-to-defaults then adopt-fetched-set
    │   ├── FIRECalculator.jsx
    │   ├── CompoundInterestCalculator.jsx
    │   ├── SankeyDiagram.jsx              # v2: nested income/expense_groups, 4-col diagram, currency+%/permalink. Two-slice state, calls migrate/stripVersion directly
    │   ├── InvestmentFeeCalculator.jsx
    │   ├── InflationCalculator.jsx
    │   ├── DividendCalculator.jsx
    │   ├── WithdrawalPlanCalculator.jsx
    │   ├── DebtPayoffCalculator.jsx       # Uses useCalculatorInputs + setInputs for array ops
    │   ├── MortgageCalculator.jsx
    │   ├── CoastFIRECalculator.jsx
    │   ├── EmergencyFundCalculator.jsx
    │   └── BaristaFIRECalculator.jsx
    ├── components/
    │   ├── ui/                 # Shared primitives used across all calculators and pages
    │   │   ├── StatCard.jsx
    │   │   ├── NumInput.jsx
    │   │   ├── ChartTooltip.jsx
    │   │   ├── SaveNameModal.jsx
    │   │   ├── DeleteAccountModal.jsx     # Password-confirmed account deletion modal
    │   │   └── CalculatorSkeleton.jsx     # Loading skeleton for lazy calculator chunks
    │   ├── wealth/                        # Net Worth tracker components (consumed by WealthPage)
    │   │   ├── categories.js              # Per-tab field/column configs + enum options (values mirror backend net_worth_types.py); gain/loss columns use derive() from overviewSelectors
    │   │   ├── overviewSelectors.js       # Pure Overview derivation — per-item gain (asset/investment/property, mirrors backend), debtToAssetRatio, snapshotDelta, liabilitiesBreakdown (incl. mortgages slice)
    │   │   ├── CategoryManager.jsx        # Generic add/edit form + table for one category; driven by a categories.js config (supports derived + gainloss columns)
    │   │   ├── Dashboard.jsx              # Overview tab — recharts allocation pie + category bar + category cards + liabilities breakdown + net-worth-over-time line (with delta-vs-last) + "take snapshot"
    │   │   ├── managerHelpers.js          # Pure helpers (buildPayload/canSubmit/initialForm/formFromRow/formatCell/deriveCell/gainTone)
    │   │   ├── managerHelpers.test.js     # vitest unit tests for the helpers
    │   │   ├── overviewSelectors.test.js  # vitest — gain reconciliation, debt ratio, snapshot delta, liabilities breakdown
    │   │   ├── CategoryManager.test.jsx   # RTL — render/add/edit/delete/validation
    │   │   └── Dashboard.test.jsx         # RTL — summary figures, chart sections, snapshot action
    │   ├── income/                        # Income & Expense tracker components (consumed by IncomeExpensePage)
    │   │   ├── incomeExpenseOptions.js    # TYPE_OPTIONS + per-type CATEGORY_OPTIONS + RECURRENCE_UNIT_OPTIONS/recurrenceLabel (values mirror backend income_expense_types.py)
    │   │   ├── TransactionsPanel.jsx      # Year/month/type filters + table + add/edit form (category + recurrence rule, options depend on type)
    │   │   ├── cashflowSelectors.js       # Pure Overview derivation — monthlyIncomeStats (avg/median), categoryBreakdown (year/month slice of the txn list); single source for month/year filtering
    │   │   ├── recurrence.js              # Pure forecast projection — projectRecurring/forecastByMonth: project recurring txns into the empty future months (read-time only, never persisted)
    │   │   └── CashflowDashboard.jsx      # Overview tab — recharts: per-month income (avg/median toggle), monthly income-vs-expense bar (with recurrence forecast), spending-by-category pie (year or month-scoped), year selector
    │   ├── AppFooter.jsx                  # Compact single-row legal footer (© line + Privacy/Terms/Imprint/Source) — rendered once by AppShell, so it appears on every /app page
    │   ├── AppShell.jsx                   # In-app layout shell — renders AppSidebar (desktop slot + mobile drawer) + content + AppFooter; render-prop children get { openSidebar }. Wraps every /app page
    │   ├── AppSidebar.jsx                 # THE shared sidebar — three sibling top-level categories (Calculators expandable→muted calcs, Net Worth, Income & Expenses, all flag-gated) + collapse toggle + optional saved-calcs slot + UserFooter
    │   ├── CalculatorHeader.jsx           # Header: title, save button, status pill, mobile menu, "New" button
    │   ├── CalculatorExplainer.jsx        # ← "What is X?" gradient banner, driven by registry data
    │   ├── SavedCalculationsSidebar.jsx   # List of saved calcs with click-to-deselect on active item (injected into AppSidebar's slot by CalculatorPage)
    │   ├── AuthCardShell.jsx              # Presentational chrome (gray page + top bar + white card + badge/title/subtitle/footer) for the auth family; used by AuthForm + Forgot/Reset pages
    │   ├── AuthForm.jsx                   # Shared email+password form for LoginPage + RegisterPage (renders inside AuthCardShell)
    │   ├── ErrorBoundary.jsx              # Top-level render-error boundary (wraps Routes in App.jsx) — fallback with Reload + Back-to-calculators instead of a white screen (#23); reports the crash to Sentry (#174)
    │   ├── ErrorBoundary.test.jsx         # vitest — fallback on a thrown child, children pass through otherwise, and the crash is reported to Sentry
    │   └── UserFooter.jsx                 # Authenticated-user footer (email + Settings link + sign out + delete account modal)
    ├── hooks/
    │   ├── useAuth.js                 # login / logout / register / deleteAccount + session rehydration
    │   ├── useCalculatorData.js       # Saved-calculations CRUD via API
    │   ├── useNetWorthData.js         # Net Worth data layer — fetches resources + summary + snapshots; CRUD methods that refetch on success
    │   ├── useIncomeExpenseData.js    # Income & Expense data layer — year/month-filtered transactions + summary; CRUD that refetches
    │   ├── useCalculatorInputs.js     # Input state plumbing (state + sync + onChange + version migration)
    │   ├── useSave.js                 # Save flow + status states. Strips version key before sending. Resets on type change.
    │   ├── useFavourites.js           # Per-user favourites via localStorage
    │   ├── useSidebarCollapse.js      # Session-scoped sidebar collapse state — module-level boolean via useSyncExternalStore, persists across navigation (no storage/Context/store)
    │   └── useDocumentTitle.js        # Sets a distinct document.title per route (SPA SEO); resets to default on unmount
    ├── marketing/                     # Public marketing surface (parallel to calculators/) — consumed only by the landing + legal pages
    │   ├── links.js                   # Single source for GITHUB_URL + CONTACT_EMAIL placeholder (used by nav/strip/footer/legal)
    │   ├── MarketingNav.jsx           # Sticky full-width 3-col top nav: wordmark left · centered sections (Guide/Calculators/Comparison/ETFs and Stocks) · "Login App" hover-menu (Login/Register) right, or "Open app" when authed; mobile disclosure menu
    │   ├── Carousel.jsx               # Paginated card carousel (responsive N-per-page, autoplay + arrows + dots; no cut-off cards) — used by CalculatorShowcase + ComingSoonStrip
    │   ├── Hero.jsx                   # Headline + subline + primary CTA → /app, secondary → /register
    │   ├── CalculatorShowcase.jsx     # One card per PUBLISHED_CALCULATORS; links straight to /app/calculator/:type
    │   ├── ComingSoonStrip.jsx        # Trackers from UPCOMING_FEATURES ("More on the way")
    │   ├── ValueProps.jsx             # Four true value props (free, no-signup, save, privacy)
    │   ├── MarketingFooter.jsx        # Privacy/Terms links + "View source on GitHub" button, © line, not-financial-advice line
    │   └── LegalLayout.jsx            # Shared prose chrome for legal pages (reuses MarketingNav + MarketingFooter)
    └── pages/
        ├── MarketingLandingPage.jsx # / — public marketing landing; composes src/marketing/*; auth-adaptive nav (no redirect for logged-in visitors)
        ├── MarketingComingSoonPage.jsx # /guide, /comparison, /etfs-stocks — Beta "coming soon" placeholders (one component, title/blurb per route); full surfaces are later cycles (project.md § Future)
        ├── PrivacyPage.jsx        # /privacy — privacy policy on LegalLayout; written against actual data practices
        ├── TermsPage.jsx          # /terms — terms of service on LegalLayout; educational-tools-not-advice disclaimer
        ├── ImprintPage.jsx        # /imprint — imprint/Impressum on LegalLayout; placeholder operator details to complete before launch
        ├── CalculatorPage.jsx     # /app/calculator/:type — orchestrator; renders explainer + lazy calc inside Suspense
        ├── LandingPage.jsx        # /app — the *in-app* landing: calculator grid + filter tabs + favourites + coming-soon teaser cards. Wrapped in AppShell (shared sidebar + mobile drawer)
        ├── ComingSoonPage.jsx     # /app/coming-soon/:slug — build-in-public teaser page for an upcoming tracker; unknown slug redirects to /app like an unknown calc type
        ├── WealthPage.jsx         # /app/net-worth (auth-guarded) — Net Worth tracker: sticky NW/assets/liabilities bar + tabs + Overview dashboard + category panels
        ├── WealthPage.test.jsx    # RTL — sticky summary, default Overview, tab switch renders the category manager
        ├── IncomeExpensePage.jsx  # /app/income-expenses (auth-guarded, ships dark) — Income & Expense tracker: sticky Income/Expense/Net bar + tabs (Overview #124, Transactions #123)
        ├── LoginPage.jsx          # Thin wrapper around AuthForm (+ "Forgot password?" link)
        ├── RegisterPage.jsx       # Thin wrapper around AuthForm
        ├── ForgotPasswordPage.jsx # /forgot-password — email field; always shows the same neutral "check your inbox" state
        ├── ResetPasswordPage.jsx  # /reset-password/:token — new password + confirm; success / generic-invalid-link / weak-password states
        ├── SettingsPage.jsx       # /app/settings (auth-guarded) — account email + Premium teaser (#177 upgrade events) + change password + change email + "Your data" export download (#180) + danger zone (DeleteAccountModal)
        └── admin/                 # /admin — internal admin-only portal (RequireAdmin gate; invisible to non-admins). Phase 12 — Admin Control Center
            ├── AdminPage.jsx      # Shell: dark sticky top bar (wordmark + 3 tabs + "internal · /admin" badge + avatar), switches Overview/Analytics/Users
            ├── AdminOverview.jsx  # Project Status — stat strip + calculator catalog table with live publish toggles (optimistic + rollback; invalidatePublished on success)
            ├── AdminAnalytics.jsx # Analytics screen — DB signup KPIs + GA4 traffic (VendorStatus-gated) + PostHog activation funnel & most-used calculators (#178), per-vendor empty states
            └── AdminUsers.jsx     # Users screen — search/tier chips, tier menu (tier / suspend / admin-role) + support tools (#182: export-data link, two-step delete confirm mirroring the server guards)
```

### Frontend environment variables (Vercel)

The frontend ships **no `VITE_`-prefixed variables** — nothing about the backend
is baked into the client bundle. The one deploy-time variable is read at the edge:

| Variable | Read by | Scope | Notes |
|----------|---------|-------|-------|
| `BACKEND_ORIGIN` | `middleware.js` (Vercel Edge, at request time) | Set **twice** — Production → prod Render URL, Preview → staging Render URL | Server/edge-only (unprefixed), so it never reaches client JS. Unset → middleware returns `502`. See `docs/DEPLOYMENT.md` + `DECISIONS.md` § "API proxy target is environment-driven". |

---

## Route map

Defined in `frontend/src/App.jsx`. The marketing surface owns `/`; the app lives
under `/app/*`; the auth doors stay top-level (shared between marketing and app).
Every old top-level app path redirects (param-preserving) to its `/app` home so
existing links and staging bookmarks survive. The Vercel SPA fallback
(`vercel.json`) serves all of these on a hard refresh.

| Path | Page / behaviour | Guard |
|------|------------------|-------|
| `/` | `MarketingLandingPage` (logged-in users see it too — no redirect) | — |
| `/privacy` | `PrivacyPage` | — |
| `/terms` | `TermsPage` | — |
| `/imprint` | `ImprintPage` | — |
| `/app` | `LandingPage` (in-app grid) | — |
| `/app/calculator/:type` | `CalculatorPage` | unpublished/unknown type → `/app` |
| `/app/coming-soon/:slug` | `ComingSoonPage` | unknown slug → `/app` |
| `/app/settings` | `SettingsPage` | `RequireAuth` (→ `/login`, `from: /app/settings`) |
| `/login`, `/register` | `LoginPage` / `RegisterPage` | `RequireGuest` (authed → `/app`) |
| `/forgot-password` | `ForgotPasswordPage` | — (public) |
| `/reset-password/:token` | `ResetPasswordPage` | — (public) |
| `/calculator/:type` | → `/app/calculator/:type` | redirect (param-preserving) |
| `/coming-soon/:slug` | → `/app/coming-soon/:slug` | redirect (param-preserving) |
| `/settings` | → `/app/settings` | redirect |
| `*` | → `/` | catch-all redirect |

**Auth return-to flow:** an anonymous user who clicks Save on a calculator has
their inputs stashed in `sessionStorage` (keyed by calc *type*, so it's
path-independent), then is sent to `/login` with `state.from =
/app/calculator/:type`. On success they're returned there and `CalculatorPage`
rehydrates the inputs. The `from` fallback for a bare nav "Sign in" is `/app`.

## Registry entry shape

Every entry in `frontend/src/calculators/registry.js` has this shape. All fields are required.

```js
{
  type:        'fire',                              // unique slug, matches backend calc_types.py
  published:   true,                                // REQUIRED — true = visible in the public app
  label:       'FIRE Calculator',                   // shown in nav + page header
  subtitle:    'Financial Independence',            // shown on landing-page card
  description: 'Calculate your path to ...',        // landing-page card copy
  explainer: {                                      // banner on calculator page
    heading: 'What is FIRE?',
    body:    'Financial Independence, Retire Early...',
  },
  category:    'Retirement',                        // 'Retirement' | 'Investing' | 'Budgeting' | 'Debt & Property'
  Icon:        Flame,                               // lucide-react icon
  color:       'text-emerald-500',                  // accent for nav active state, header icon
  gradient:    'from-emerald-500 to-teal-600',      // landing-page card + explainer banner
  badge:       'bg-emerald-100 text-emerald-800',   // landing-page badge styling
  component:   lazy(() => import('./FIRECalculator')),
}
```

**`published`** gates whether a calculator appears in the public app. The MVP
ships with four published calculators — `fire`, `compound`, `emergency_fund`,
`debt_payoff` — and eight unpublished ones that re-enable by flipping the flag.
The user-facing surface derives from this flag, never from a hand-kept list:

| Export | Derives from | Consumed by |
|--------|-------------|-------------|
| `CALCULATORS` | source of truth (all 12) | `CALC_MAP`, `VALID_TYPES`, the published exports |
| `CALC_MAP` / `VALID_TYPES` | all 12 | `CalculatorPage` lookup; `VALID_TYPES` mirrors backend `calc_types.py` |
| `PUBLISHED_CALCULATORS` / `PUBLISHED_TYPES` | `published: true` | sidebar nav, landing grid + tabs, favourites filter, routing guard |
| `CATEGORIES` | `PUBLISHED_CALCULATORS` | sidebar + landing tabs (empty categories never render) |

See `DECISIONS.md` § "MVP narrowing via `published` flag".

---

## Key Conventions

### Frontend

| Convention | Detail |
|-----------|--------|
| Calculator inputs | Use `useCalculatorInputs({ defaults, initialData, onDataChange, calcType })` — returns `{ inputs, set, setInputs }`. Use `set('field')` for scalars, `setInputs(prev => ...)` for nested arrays |
| Calculator DEFAULTS | Must include `version: 1` as the first field. Bump and add a migration in `migrateCalcData.js` whenever you rename/restructure a saved field |
| Number formatting | `import { fmt } from '../utils/format'` — never write a local `fmt()`. `fmt(1500)` → `"$1.5K"`. Compact ladder is K/M/B/T with a `$999T+` display ceiling so extreme-but-valid magnitudes never render as overflow strings. Pass `{ currency: '€' }` or `{ thousandDecimals: 0 }` for variants |
| Numeric input bounds | Every calculator `NumInput` passes `min`/`max` (monetary fields `0…1e9`, rates `0…30–50%`, periods `1…100`). `NumInput` **clamps on change** — native `min`/`max` only constrain the spinner and don't stop typed/pasted values, so the clamp is the real guard. New calculators must pass bounds to comply |
| Derived metrics | Computed ratios/percentages that bypass `fmt()` (Money Multiplier, Interest %, Coverage %, ROI) route through `finiteOr(value, fallback)` from `utils/format.js` so a zero denominator or non-finite result renders the fallback, never `Infinity`/`NaN` |
| Calculator explainers | Driven by `registry.js`'s `explainer: { heading, body }`. Rendered once in `CalculatorPage` above the Suspense boundary via `<CalculatorExplainer>`. Calculator components must NOT render their own explainer |
| Shared UI | All reusable primitives live in `src/components/ui/`. Larger composed components (sidebar, header, explainer, footer, auth form) live one level up in `src/components/` |
| Auth state | Owned by `App.jsx` via `useAuth`, passed down as props — no Context |
| Auth pages | Both `LoginPage` and `RegisterPage` are thin wrappers around `<AuthForm>` — only badge, copy, and submit handler differ |
| User footer | The authenticated-user block (email + sign out + delete account modal) is `<UserFooter>` — rendered once inside the shared `AppSidebar` (`variant="compact"`). Owns the delete-modal state internally. |
| Save logic | Fully encapsulated in `src/hooks/useSave.js`. Uses `stripVersion()` so the internal `__v` key never reaches the backend. Resets `activeSavedCalcId` on calculator type change |
| New / deselect | "New" button on header (visible only when a record is loaded) and click-on-active in saved sidebar both detach from `activeSavedCalcId` without resetting inputs |
| Favourites | Stored in `localStorage` keyed by `sm_favourites_${user.id}` — per-user, no backend needed. Logic in `useFavourites.js` |
| Storage keys | Never hardcode — always import from `src/constants.js` |
| Calculator imports | Each calculator imports `StatCard`, `NumInput`, `ChartTooltip` from `'../components/ui/'` |
| Lazy loading | All calculator components use `lazy()` in `registry.js` — `CalculatorPage` wraps render in `<Suspense>` with `CalculatorSkeleton` fallback |
| Sidebar nav | Grouped by category, collapsible — active category expanded by default |
| API calls | All go through `httpClient.createApi(baseUrl)`. Never call `fetch` directly from a feature module. New API namespaces just add one file in `src/api/` |
| CSRF | Token fetched on app mount via `authApi.fetchCsrfToken()`, stored in memory in `authApi`. `httpClient` injects it as `X-CSRF-Token` on all mutating requests via a getter registered by `authApi` at load time |
| Mobile-first floors | Base classes target the 375px phone; `sm:`/`lg:` prefixes restore the current desktop look (desktop stays visually unchanged). Body text ≥ `text-sm` on mobile (`text-xs` only for true captions); interactive elements ≥ 44px hit area on mobile (`min-h-[44px]` / `py-2.5`, reverted at `sm:`); numeric & text inputs use `text-base sm:text-sm` + an `inputMode` so phones show the right keypad and iOS doesn't zoom on focus. The single app-wide sidebar drawer is hidden below `lg` and opens from a header hamburger |
| Sidebar drawer | One drawer pattern for the whole app: the dark sidebar is `hidden lg:block` with a `lg:hidden` overlay + backdrop, opened from a header hamburger, closed by backdrop tap / close button / navigation. `LandingPage` and `CalculatorPage` both use it (drawer open/close is local `useState`, no global state) |

### Backend

| Convention | Detail |
|-----------|--------|
| Calculator types | Defined once in `calc_types.py`. `calculator_schema.py` and `db_init.py` both import `VALID_CALC_TYPES` from there |
| IDOR protection | Every query on `saved_calculators` includes `AND user_id = ?` — users cannot access each other's data. Same rule for upcoming tracker tables |
| Rate limiting | `limiter` instance defined in `app.py`, imported by route files. Set per-route with `@limiter.limit()` |
| Security headers | Flask-Talisman in `app.py` — `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, HTTPS redirect in prod |
| CSRF | Token generated by `GET /api/auth/csrf-token`, stored in server-side session. `@csrf_protect` decorator verifies `X-CSRF-Token` header on every mutating route. `clear_session()` preserves the token across logout |
| Password rules | Enforced in `user_schema.py` — 8+ chars, at least 1 letter, at least 1 number |
| Account deletion | `DELETE /api/auth/account` requires password confirmation. Cascades to all saved calculations via `ON DELETE CASCADE` |
| Session expiry | 30 days (`PERMANENT_SESSION_LIFETIME`) — set in `config.py` |
| Secret key | App exits at startup if key is missing, under 32 chars, or still the placeholder value |
| Config | All sensitive values read from `.env` via `python-dotenv` — nothing hardcoded in `config.py` |

---

## Adding a New API Namespace

If you need a new API surface (e.g. `netWorthApi.js`, `transactionsApi.js`, `settingsApi.js`):

1. Create `frontend/src/api/yourApi.js`
2. `import { createApi } from './httpClient'` and `const api = createApi('/api/your-prefix')`
3. Export `{ get, post, put, delete }` calls — CSRF, credentials, JSON parsing are handled automatically
4. No need to touch `httpClient.js` or `authApi.js`

---

## Adding a New Calculator (legacy — no more calculators planned)

The 12 existing calculators are the full set. This recipe is retained for reference in case the decision is reversed.

1. Create component in `frontend/src/calculators/` using `useCalculatorInputs` + `fmt` + `version: 1` in DEFAULTS. Do NOT render an explainer in the component.
2. Add entry to `registry.js` with all required fields (including `explainer: { heading, body }`)
3. Add type string to `backend/calc_types.py` (single source — `schemas/calculator_schema.py` and `db_init.py` both import `VALID_CALC_TYPES` from here)
4. Run `python db_init.py`

---

## Versioning Saved Data — How To

When you change a saved-data shape (rename a field, change units, restructure):

1. Bump `DEFAULTS.version` (e.g. `version: 1` → `version: 2`)
2. Add a migration step in `frontend/src/utils/migrateCalcData.js`:
   ```js
   const MIGRATIONS = {
     fire: {
       2: (data) => ({
         ...data,
         savings_pct: data.savings_rate,        // rename
         savings_rate: undefined,
       }),
     },
   }
   ```
3. Old saved records load through this migration automatically.
4. The `__v` key is stripped on save so the backend stores only user-input fields.

**Forward-compat note:** if a client sees a saved record with a higher version than its `DEFAULTS.version`, it logs a warning and uses the data as-is rather than downgrading.

**Live example — Sankey v1→v2:** Sankey is the first calculator to use this in production. Its migration wraps the old flat `expense_categories[]` into a single nested `expense_groups[]` entry labelled "Expenses". See the `sankey` block in `migrateCalcData.js` for a real, non-trivial migration (it's also idempotent — re-running on a v2 record is a no-op).

**This rule extends to the upcoming trackers.** Net worth entries, transactions, settings, anything user-scoped that's stored — same versioning pattern from day one.

---

## Upcoming structural changes

The tree above is the *current* state, not the final one. Planned surfaces that
will add new files/tables — the Net Worth and Income/Expense trackers, the
tier/entitlement system, and i18n — are tracked in `project.md` § "Future"; their
rationale and open questions live in `DECISIONS.md` § "Decisions still to make".
