# SpreadsheetMillionaire — Project Structure

> Keep this file updated whenever files are added, moved, or deleted.
> Claude reads this first to resolve import paths and file locations.

---

## Repository Root

```
money-calculators/
├── .gitignore
├── README.md                   # Quickstart, local dev, env vars, roadmap
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
├── app.py                      # Flask app factory — ProxyFix, db teardown, limiter + Talisman, startup warnings
├── config.py                   # All config read from .env — exits if SECRET_KEY/DATABASE_URL invalid (and REDIS_URL in prod)
├── calc_types.py               # Single source of truth for VALID_CALC_TYPES (imported by schema + db_init)
├── db.py                       # Per-request psycopg connection on Flask g, closed on teardown (no in-process pool)
├── db_init.py                  # Postgres schema creation + idempotent CHECK-constraint rebuild (users, saved_calculators, password_reset_tokens)
├── __pycache__/
├── venv/                       # Python virtual environment — never committed
├── models/
│   ├── user.py                 # User model — bcrypt hashing, create/get/delete, update_password/update_email
│   ├── calculator.py           # SavedCalculator model — all queries include AND user_id = %s
│   └── password_reset.py       # PasswordResetToken model — stores only the SHA-256 hash; create/find-valid-by-hash/mark-used/invalidate-all-for-user/delete-expired
├── routes/
│   ├── auth.py                 # /api/auth/* — register (+welcome email), login, logout, status, delete account, csrf-token, forgot-password, reset-password, change-password, change-email
│   ├── calculators.py          # /api/calculators/* — CRUD for saved calculations
│   └── health.py               # GET /api/health — liveness probe, rate-limit exempt, no DB/Redis
├── schemas/
│   ├── user_schema.py          # Shared validate_password (8+ chars, 1 letter, 1 number) + Register/Login/ResetPassword/ChangePassword/ChangeEmail schemas
│   └── calculator_schema.py    # Imports VALID_CALC_TYPES from calc_types.py
├── services/
│   └── email.py                # Resend wrapper — send_email + send_welcome_email + send_password_reset_email; disabled (no-op) without RESEND_API_KEY
└── utils/
    └── auth_helpers.py         # login_required, csrf_protect, set/clear session, generate_csrf_token
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
├── vite.config.js              # Proxies /api/* → localhost:5000
├── vercel.json                 # Single-origin deploy — rewrites /api/* to Render + SPA fallback
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── App.jsx                 # BrowserRouter + full route map. Marketing at / (+ /privacy, /terms); app namespaced under /app/*; RequireGuest (login/register) + RequireAuth (/app/settings) wrappers; param-preserving redirects from old top-level app paths. See "Route map" below
    ├── main.jsx                # React root mount
    ├── index.css               # Tailwind directives + base styles
    ├── constants.js            # Shared storage key generators (CALC_STORAGE_KEY, FAVOURITES_KEY)
    ├── upcomingFeatures.js     # UPCOMING_FEATURES tracker teasers (Net Worth, Income/Expense) — deliberately NOT in the calculator registry; consumed only by the LandingPage grid + CalculatorSidebar "Coming soon" section
    ├── api/
    │   ├── httpClient.js       # Shared fetch wrapper. createApi(baseUrl) factory + central CSRF injection
    │   ├── authApi.js          # register / login / logout / deleteAccount / getStatus / fetchCsrfToken / forgotPassword / resetPassword / changePassword / changeEmail
    │   └── calculatorApi.js    # getAll / create / update / remove
    ├── utils/
    │   ├── format.js           # Shared fmt() — replaces 12 local copies, supports custom currency
    │   └── migrateCalcData.js  # migrate() / stripVersion() / injectVersion() — saved-data versioning
    ├── calculators/
    │   ├── registry.js                     # ← ONLY file to touch when adding a calculator
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
    │   ├── CalculatorSidebar.jsx          # Grouped collapsible nav + saved calcs + UserFooter
    │   ├── CalculatorHeader.jsx           # Header: title, save button, status pill, mobile menu, "New" button
    │   ├── CalculatorExplainer.jsx        # ← "What is X?" gradient banner, driven by registry data
    │   ├── SavedCalculationsSidebar.jsx   # List of saved calcs with click-to-deselect on active item
    │   ├── AuthCardShell.jsx              # Presentational chrome (gray page + top bar + white card + badge/title/subtitle/footer) for the auth family; used by AuthForm + Forgot/Reset pages
    │   ├── AuthForm.jsx                   # Shared email+password form for LoginPage + RegisterPage (renders inside AuthCardShell)
    │   └── UserFooter.jsx                 # Authenticated-user footer (email + Settings link + sign out + delete account modal)
    ├── hooks/
    │   ├── useAuth.js                 # login / logout / register / deleteAccount + session rehydration
    │   ├── useCalculatorData.js       # Saved-calculations CRUD via API
    │   ├── useCalculatorInputs.js     # Input state plumbing (state + sync + onChange + version migration)
    │   ├── useSave.js                 # Save flow + status states. Strips version key before sending. Resets on type change.
    │   ├── useFavourites.js           # Per-user favourites via localStorage
    │   └── useDocumentTitle.js        # Sets a distinct document.title per route (SPA SEO); resets to default on unmount
    ├── marketing/                     # Public marketing surface (parallel to calculators/) — consumed only by the landing + legal pages
    │   ├── links.js                   # Single source for GITHUB_URL + CONTACT_EMAIL placeholder (used by nav/strip/footer/legal)
    │   ├── MarketingNav.jsx           # Sticky top nav; auth-adaptive CTAs (Open app vs Sign in/Get started); mobile disclosure menu
    │   ├── Hero.jsx                   # Headline + subline + primary CTA → /app, secondary → /register
    │   ├── CalculatorShowcase.jsx     # One card per PUBLISHED_CALCULATORS; links straight to /app/calculator/:type
    │   ├── ComingSoonStrip.jsx        # Trackers from UPCOMING_FEATURES ("More on the way")
    │   ├── ValueProps.jsx             # Four true value props (free, no-signup, save, privacy)
    │   ├── MarketingFooter.jsx        # Privacy/Terms links + "View source on GitHub" button, © line, not-financial-advice line
    │   └── LegalLayout.jsx            # Shared prose chrome for legal pages (reuses MarketingNav + MarketingFooter)
    └── pages/
        ├── MarketingLandingPage.jsx # / — public marketing landing; composes src/marketing/*; auth-adaptive nav (no redirect for logged-in visitors)
        ├── PrivacyPage.jsx        # /privacy — privacy policy on LegalLayout; written against actual data practices
        ├── TermsPage.jsx          # /terms — terms of service on LegalLayout; educational-tools-not-advice disclaimer
        ├── ImprintPage.jsx        # /imprint — imprint/Impressum on LegalLayout; placeholder operator details to complete before launch
        ├── CalculatorPage.jsx     # /app/calculator/:type — orchestrator; renders explainer + lazy calc inside Suspense
        ├── LandingPage.jsx        # /app — the *in-app* landing: calculator grid + filter tabs + favourites + coming-soon teaser cards. Collapsible sidebar drawer below lg (local mobileSidebarOpen state)
        ├── ComingSoonPage.jsx     # /app/coming-soon/:slug — build-in-public teaser page for an upcoming tracker; unknown slug redirects to /app like an unknown calc type
        ├── LoginPage.jsx          # Thin wrapper around AuthForm (+ "Forgot password?" link)
        ├── RegisterPage.jsx       # Thin wrapper around AuthForm
        ├── ForgotPasswordPage.jsx # /forgot-password — email field; always shows the same neutral "check your inbox" state
        ├── ResetPasswordPage.jsx  # /reset-password/:token — new password + confirm; success / generic-invalid-link / weak-password states
        └── SettingsPage.jsx       # /app/settings (auth-guarded) — account email + change password + change email + danger zone (DeleteAccountModal)
```

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
| User footer | The authenticated-user block (email + sign out + delete account modal) is `<UserFooter>` — used on both LandingPage (`variant="roomy"`) and CalculatorSidebar (`variant="compact"`). Owns the delete-modal state internally. |
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
