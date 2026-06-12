# SpreadsheetMillionaire — Project Structure

> Keep this file updated whenever files are added, moved, or deleted.
> Claude reads this first to resolve import paths and file locations.

---

## Repository Root

```
money-calculators/
├── .gitignore
├── README.md
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
├── db_init.py                  # Postgres schema creation + idempotent CHECK-constraint rebuild
├── __pycache__/
├── venv/                       # Python virtual environment — never committed
├── models/
│   ├── user.py                 # User model — bcrypt hashing, create/get/delete
│   └── calculator.py           # SavedCalculator model — all queries include AND user_id = %s
├── routes/
│   ├── auth.py                 # /api/auth/* — register (+welcome email), login, logout, status, delete account, csrf-token
│   ├── calculators.py          # /api/calculators/* — CRUD for saved calculations
│   └── health.py               # GET /api/health — liveness probe, rate-limit exempt, no DB/Redis
├── schemas/
│   ├── user_schema.py          # Password: 8+ chars, 1 letter, 1 number enforced
│   └── calculator_schema.py    # Imports VALID_CALC_TYPES from calc_types.py
├── services/
│   └── email.py                # Resend wrapper — send_email + send_welcome_email; disabled (no-op) without RESEND_API_KEY
└── utils/
    └── auth_helpers.py         # login_required, csrf_protect, set/clear session, generate_csrf_token
```

### Backend .env variables

| Variable | Dev value | Prod value |
|----------|-----------|------------|
| `FLASK_SECRET_KEY` | generate with `secrets.token_hex(32)` | same — app exits if missing/placeholder |
| `FLASK_ENV` | `development` | `production` |
| `CORS_ORIGINS` | `http://localhost:5173` | your deployed frontend URL |
| `DATABASE_URL` | Neon **dev branch** pooled URL (`postgres://…`) | Neon **main branch** pooled URL — app exits if missing / not Postgres |
| `REDIS_URL` | Upstash `rediss://…` (optional in dev — unset falls back to filesystem sessions) | Upstash `rediss://…` — app exits if missing |
| `RESEND_API_KEY` | Resend key (optional — unset disables email) | Resend key (email disabled with a warning if unset) |
| `MAIL_FROM` | sender address, e.g. `noreply@spreadsheetmillionaire.com` | same |
| `SESSION_COOKIE_SECURE` | `False` | `True` |

> `DATABASE_URL` must point at Neon's **pooled** (PgBouncer) endpoint — connection
> pooling happens there, not in-process. `sslmode=require` is appended automatically
> if absent. `RATELIMIT_STORAGE_URI` is no longer set directly: the limiter uses
> `REDIS_URL` when present, else `memory://` (dev fallback only).

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
    ├── App.jsx                 # BrowserRouter, routes, auth + CSRF loading guard
    ├── main.jsx                # React root mount
    ├── index.css               # Tailwind directives + base styles
    ├── constants.js            # Shared storage key generators (CALC_STORAGE_KEY, FAVOURITES_KEY)
    ├── api/
    │   ├── httpClient.js       # Shared fetch wrapper. createApi(baseUrl) factory + central CSRF injection
    │   ├── authApi.js          # register / login / logout / deleteAccount / getStatus / fetchCsrfToken
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
    │   ├── AuthForm.jsx                   # Shared form shell for LoginPage + RegisterPage
    │   └── UserFooter.jsx                 # Authenticated-user footer (email + sign out + delete account modal)
    ├── hooks/
    │   ├── useAuth.js                 # login / logout / register / deleteAccount + session rehydration
    │   ├── useCalculatorData.js       # Saved-calculations CRUD via API
    │   ├── useCalculatorInputs.js     # Input state plumbing (state + sync + onChange + version migration)
    │   ├── useSave.js                 # Save flow + status states. Strips version key before sending. Resets on type change.
    │   └── useFavourites.js           # Per-user favourites via localStorage
    └── pages/
        ├── CalculatorPage.jsx     # Orchestrator — renders explainer + lazy calc inside Suspense
        ├── LandingPage.jsx        # Calculator grid + filter tabs + favourites  (NB: this is the *in-app* landing; the marketing landing page is a separate upcoming page)
        ├── LoginPage.jsx          # Thin wrapper around AuthForm
        └── RegisterPage.jsx       # Thin wrapper around AuthForm
```

---

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
| Number formatting | `import { fmt } from '../utils/format'` — never write a local `fmt()`. `fmt(1500)` → `"$1.5K"`. Pass `{ currency: '€' }` or `{ thousandDecimals: 0 }` for variants |
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

## Upcoming structural changes (placeholder)

These will be added as their work begins. Listed here so the file tree above is understood to be the *current* state, not the *final* state.

- **Marketing landing page** — new route (likely `/`), with the in-app landing moved to `/app` or similar
- **Net worth tracker** — new pages, new API namespace, new DB tables (entries + optionally accounts)
- **Income/expense tracker** — new pages, new API namespace, new DB tables (transactions + categories)
- **Settings page** — new route, new API namespace, language preference, tier display, account management
- **Tier / entitlement system** — `tier` field on users table, decorator on routes, gate component on UI, see `DECISIONS.md` § "Decisions still to make"
- **i18n** — `react-i18next` integration, `fmt()` localisation, message catalogues
