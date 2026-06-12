# SpreadsheetMillionaire — Project Status & Technical Documentation

> A single-page technical reference: what the product is, how it's built, what
> runs it, and how its API behaves. For deeper *why*, see `DECISIONS.md`; for
> *where things live*, see `PROJECT_STRUCTURE.md`.
>
> **Last updated:** 12 June 2026 · **Phase:** 6 merged to `develop` (marketing
> landing, `/app` restructure, legal pages) · **Release target:** `v0.6.0`.

---

## 1. At a glance

A personal-finance calculator web app. Anonymous visitors can use every published
calculator with zero signup; authenticated users can save, rename, reload, and
delete their inputs. The public MVP ships **4 of 12** calculators; the other 8
are built but hidden behind a `published` flag and re-enable one at a time as
build-in-public patches.

- **Frontend:** React 18 SPA (Vite), client-side routing, calculations run in the browser.
- **Backend:** Flask 3 JSON API under gunicorn, raw SQL on Postgres, server-side sessions.
- **Public surface:** marketing at `/`, the app under `/app/*`, legal pages at `/privacy`, `/terms`, `/imprint`.

## 2. Documentation map

| File | What it covers |
|------|----------------|
| `README.md` | Quickstart, local dev, env vars, roadmap |
| `STATUS.md` (this file) | Technical reference: stack, providers, architecture, data model, API |
| `PROJECT_STRUCTURE.md` | Canonical file tree, route map, conventions, how-to recipes |
| `DECISIONS.md` | The *why* behind every architectural choice, with revisit triggers |
| `CLAUDE.md` | Hard rules + working style for AI assistants on this codebase |
| `docs/DEPLOYMENT.md` | Staging deploy runbook (Render + Vercel) |

---

## 3. Tech stack

### Frontend
| Dependency | Version | Role |
|-----------|---------|------|
| react / react-dom | ^18.3 | UI |
| react-router-dom | ^6.26 | Client-side routing |
| recharts | ^2.12 | Charts (most calculators) |
| d3 / d3-sankey | ^7.9 / ^0.12 | Sankey cash-flow diagram |
| lucide-react | ^0.383 | Icon set (the only icon source) |
| tailwindcss | ^3.4 | Styling (utility-first, no UI kit) |
| vite | ^5.4 | Build + dev server |

> HTTP goes through a custom `fetch` wrapper (`src/api/httpClient.js`) with
> central CSRF injection — **not** axios (which is present in `package.json` but
> unused, a candidate for removal). No global state library: local state + custom
> hooks only (see `DECISIONS.md` § "State management").

### Backend
| Dependency | Version | Role |
|-----------|---------|------|
| flask | 3.1 | Web framework / JSON API |
| gunicorn | 26.0 | WSGI server (prod, `-w 2` + ProxyFix) |
| psycopg[binary] | 3.3 | Postgres driver (raw SQL, no ORM) |
| redis | 8.0 | Session + rate-limit store client |
| flask-session | 0.8 | Server-side sessions (Redis backend) |
| flask-limiter | 3.9 | Per-route rate limiting |
| flask-talisman | 1.1 | Security headers + HTTPS redirect |
| flask-cors | 5.0 | CORS (defence-in-depth; single-origin in prod) |
| marshmallow | 3.23 | Request validation schemas |
| bcrypt | 4.2 | Password hashing |
| resend | 2.30 | Transactional email SDK |
| python-dotenv | 1.0 | `.env` loading |

---

## 4. Providers & infrastructure

| Provider | Used for | Notes |
|----------|----------|-------|
| **Vercel** | Hosts the built frontend; rewrites `/api/*` → Render | Single origin → first-party cookies, no CORS surface. SPA fallback serves all client routes. |
| **Render** | Runs the Flask backend (gunicorn) | Free tier sleeps after 15 min idle; keepalive pings `/api/health`. `$7/mo` always-on at launch. |
| **Neon** | PostgreSQL database | Branch-per-env: **dev branch** backs local/staging, **main branch** backs prod. `DATABASE_URL` points at the **pooled (PgBouncer)** endpoint. |
| **Upstash** | Redis (sessions + rate-limit counters) | `rediss://` TLS. Required in prod; optional in dev (falls back to filesystem sessions + `memory://` limiting). |
| **Resend** | Transactional email | Welcome + password-reset only. No marketing mail. Disabled (logged no-op) without `RESEND_API_KEY`. |

**Deploy topology:** browser → Vercel edge (static SPA + `/api/*` rewrite) →
Render (gunicorn → Flask) → Neon (Postgres) / Upstash (Redis) / Resend (email).
See `DECISIONS.md` § "Single-origin deployment via Vercel rewrite proxy".

---

## 5. Architecture

- **SPA + JSON API, fully decoupled.** The React app calls relative `/api/...`
  paths; Vercel proxies them to Render so the browser only ever sees one origin.
- **Calculations are client-side.** No calculator math hits the server — it's
  free, instant, and works logged-out. The backend only persists *saved* inputs.
- **Auth via server-side sessions.** Login sets a session cookie (Redis-backed);
  the cookie is first-party because of the single-origin proxy. CSRF is a
  session-stored token verified via an `X-CSRF-Token` header on mutating requests.
- **One DB connection per request** on Flask `g`, closed on teardown — no
  in-process pool (Neon's PgBouncer does the pooling).
- **State management:** local component state + custom hooks (`useAuth`,
  `useCalculatorData`, `useSave`, `useCalculatorInputs`, `useFavourites`). No
  Redux/Zustand/Context-for-app-state. `auth` is prop-drilled from `App.jsx`.

### Routing (frontend)
Marketing at `/` (+ `/privacy`, `/terms`, `/imprint`); the app under `/app/*`;
auth doors (`/login`, `/register`, `/forgot-password`, `/reset-password/:token`)
top-level. Every pre-Phase-6 app path (`/calculator/:type`, `/coming-soon/:slug`,
`/settings`) redirects param-preserving to its `/app` home. Full table in
`PROJECT_STRUCTURE.md` § "Route map".

---

## 6. Data model

Postgres, created/migrated idempotently by `python db_init.py`. Identity PKs,
`TIMESTAMPTZ` timestamps, `JSONB` for saved data.

### `users`
| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGINT identity PK | |
| `email` | TEXT NOT NULL UNIQUE | stored lowercased (case-insensitive uniqueness) |
| `password_hash` | TEXT NOT NULL | bcrypt; plaintext never stored |
| `created_at` | TIMESTAMPTZ | `DEFAULT now()` |

### `saved_calculators`
| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGINT identity PK | |
| `user_id` | BIGINT FK → users(id) | `ON DELETE CASCADE` |
| `name` | TEXT NOT NULL | user-supplied label |
| `calc_type` | TEXT NOT NULL | `CHECK` constraint = `VALID_CALC_TYPES` (rebuilt on each `db_init`) |
| `data` | JSONB NOT NULL | the saved input map (version key stripped) |
| `created_at` / `updated_at` | TIMESTAMPTZ | `updated_at` maintained by a BEFORE-UPDATE trigger |

Indexed on `user_id`. **Every query includes `AND user_id = %s`** (IDOR protection at the query layer).

### `password_reset_tokens`
| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGINT identity PK | |
| `user_id` | BIGINT FK → users(id) | `ON DELETE CASCADE` |
| `token_hash` | TEXT NOT NULL UNIQUE | SHA-256 of the raw token; raw token only ever in the emailed link |
| `expires_at` | TIMESTAMPTZ NOT NULL | 60-minute lifetime |
| `used_at` | TIMESTAMPTZ NULL | NULL = unused; timestamp = consumed (single-use) |
| `created_at` | TIMESTAMPTZ | |

Indexed on `user_id`. Expired rows cleaned opportunistically on each forgot-password call (no cron).

---

## 7. API reference

Base: all routes under `/api`. JSON in, JSON out. Mutating routes (POST/PUT/DELETE)
require a valid `X-CSRF-Token` header (fetch one from `GET /api/auth/csrf-token`).
Authenticated routes require the session cookie. Validation failures return
`422 { "errors": { field: [msg] } }`.

### Auth — `/api/auth`

| Method | Path | Auth | CSRF | Rate limit | Body | Success |
|--------|------|------|------|-----------|------|---------|
| GET | `/csrf-token` | — | — | — | — | `200 { csrf_token }` |
| POST | `/register` | — | ✓ | 10/hr | `{ email, password }` | `201 { user }` |
| POST | `/login` | — | ✓ | 20/hr; 5/min | `{ email, password }` | `200 { user }` |
| POST | `/logout` | — | ✓ | — | — | `200 { message }` |
| GET | `/status` | — | — | — | — | `200 { logged_in, user }` |
| DELETE | `/account` | ✓ | ✓ | 5/hr | `{ password }` | `200 { message }` |
| POST | `/forgot-password` | — | ✓ | 3/hr | `{ email }` | `200 { message }` (uniform) |
| POST | `/reset-password` | — | ✓ | 10/hr; 5/min | `{ token, password }` | `200 { message }` |
| POST | `/change-password` | ✓ | ✓ | 10/hr; 5/min | `{ current_password, new_password }` | `200 { message }` |
| POST | `/change-email` | ✓ | ✓ | 10/hr; 5/min | `{ password, new_email }` | `200 { user }` |

**Notable error contracts (deliberate, see `DECISIONS.md`):**
- `/login` → `401 "Invalid email or password."` whether the email exists or not (no enumeration).
- `/forgot-password` → one identical `200` body on every path (registered, unregistered, malformed, send-failure). No `422`.
- `/reset-password` → any token problem (unknown/expired/used/missing) collapses to one generic `400`. Weak new password → `422`.
- `/register` & `/change-email` duplicate email → `409` (same shape).

### Saved calculators — `/api/calculators` (all require auth)

| Method | Path | CSRF | Body / Query | Success |
|--------|------|------|--------------|---------|
| GET | `` | — | `?type=<calc_type>` (optional filter) | `200 { calculators: [...] }` |
| POST | `` | ✓ | `{ name, calc_type, data }` | `201 { calculator }` |
| PUT | `/<id>` | ✓ | `{ name?, data? }` | `200 { calculator }` |
| DELETE | `/<id>` | ✓ | — | `204` (no body) |

`PUT` with an empty body → `400`. A row that doesn't exist *for this user* → `404`
(the `AND user_id = %s` filter makes another user's row indistinguishable from a
missing one).

### Health — `/api/health`
`GET` → `200 { status: "ok" }`. Rate-limit exempt, no auth/CSRF/DB/Redis — a pure
liveness probe for Render + the keepalive pinger.

### Response object shapes
```json
// user
{ "id": 1, "email": "you@example.com", "created_at": "2026-06-12T..." }

// calculator
{ "id": 7, "user_id": 1, "name": "Aggressive FIRE", "calc_type": "fire",
  "data": { /* input map */ }, "created_at": "...", "updated_at": "..." }
```

---

## 8. Security posture

- **Passwords:** bcrypt; rules enforced (8+ chars, ≥1 letter, ≥1 number). Plaintext never stored or logged.
- **IDOR:** every user-scoped query carries `AND user_id = %s`. No permission layer — protection is at the query layer.
- **SQL:** parameterised `%s` only, never f-strings/concatenation. No ORM.
- **CSRF:** session-stored token, `X-CSRF-Token` header on all mutating routes (`@csrf_protect`). Token preserved across logout.
- **Sessions:** server-side in Redis, 30-day lifetime. A password reset updates the hash + invalidates reset tokens but does **not** force-revoke live sessions (accepted limitation — see `DECISIONS.md`).
- **Rate limiting:** per-route (tightest on auth). Redis-backed in prod so limits hold across workers; `memory://` in dev.
- **Headers:** Talisman — `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, strict `Referrer-Policy`, HTTPS redirect in prod (ProxyFix trusts one Render hop).
- **Account deletion:** password-reconfirmed; cascades to all saved rows.
- **Reset tokens:** hashed at rest, 60-min single-use, superseded on re-request.

---

## 9. Calculator system

- **Single registry.** `frontend/src/calculators/registry.js` is the source of
  truth for all 12 calculators (metadata + lazy component). Derived exports:
  `CALC_MAP`, `VALID_TYPES`, `PUBLISHED_CALCULATORS`/`PUBLISHED_TYPES`, `CATEGORIES`.
- **Published surface.** Every user-facing list derives from `PUBLISHED_*` — never
  a second hand-kept list. Backend `calc_types.py` keeps **all 12** valid so saved
  rows for hidden calculators stay loadable. MVP published: `fire`, `compound`,
  `emergency_fund`, `debt_payoff`.
- **Saved-data versioning.** Every saved shape carries `version: 1` (first field)
  with a migration path in `migrateCalcData.js`. The internal `__v` key is
  stripped before save, re-injected on load. Live example: Sankey v1→v2.
- **Trackers** (Net Worth, Income/Expense) are **not** in the registry — they live
  as teasers in `upcomingFeatures.js` until built (no component/saved-shape/backend
  type yet).

---

## 10. Decisions index

`DECISIONS.md` holds the full rationale. Highlights:

- State via local hooks, not a global store · auth prop-drilled, not Context
- Registry-driven calculators · MVP narrowing via `published` flag
- Raw SQL via psycopg, no ORM · Postgres on Neon (one conn/request, no in-process pool)
- Redis sessions + rate limiting via Upstash · CSRF on session, header-verified
- Single-origin Vercel rewrite proxy · gunicorn 2 workers + ProxyFix
- Password reset via hashed single-use tokens · transactional email via Resend
- Marketing = same Vite app at `/` · SPA SEO limitation accepted · marketing invents nothing

**Open (not yet decided):** tier/entitlement model, three-layer paid-feature gating,
tracker architecture, i18n depth, design-system primitive extraction.

---

## 11. Roadmap

Tracked in `README.md` § "Roadmap": the 8 flag-gated calculators re-enabling one at
a time; the Net Worth and Income/Expense trackers (own pages, API namespaces, DB
tables); a freemium tier; settings expansion (currency, i18n, email verification).

---

## 12. Local development

```bash
# Backend (from backend/)
python -m app                # Flask on :5000

# Frontend (from frontend/)
npm run dev                  # Vite on :5173, proxies /api/* → :5000

# DB schema (idempotent)
python db_init.py
```

Full env-var tables and the deployment checklist live in `README.md`. Branch model:
`main` ← `develop` ← `feature/*`, conventional commits, squash-merge (see `CLAUDE.md`).
