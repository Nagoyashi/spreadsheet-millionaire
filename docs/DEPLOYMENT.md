# Deployment runbook — production + staging

> The operator's source of truth for the **two-environment** setup.
> Backend → **Render** (Flask under gunicorn). Frontend → **Vercel** (static
> Vite build). They share one origin via a Vercel Edge Middleware proxy — see
> `DECISIONS.md` §§ "Single-origin deployment via Vercel rewrite proxy" and
> "API proxy target is environment-driven".
>
> This is an ops checklist. Account creation, dashboard clicks, env-var values,
> and DNS are **human** tasks; the code is already in the repo. **Names only in
> this file — never paste a secret value into a doc or a commit.**

---

## 0. The shape of the world

Two long-lived environments, each a full stack, isolated end to end:

| Environment | Frontend (Vercel) | Backend (Render) | Database (Neon) | Redis (Upstash) | Branch |
|---|---|---|---|---|---|
| **Production** | Production deployment (custom domain) | production service | **main** branch | production instance | `main` |
| **Staging** | Preview deployments | staging service | **dev** branch | staging instance | `develop` |

The frontend is **one Vercel project**. The same build serves both environments;
which backend it proxies to is decided at the edge by the `BACKEND_ORIGIN`
environment variable, scoped per environment (§ 3). There is **no second Vercel
project** — Production vs Preview scoping does the split.

The backend is **two separate Render services** (§ 2) — they don't share a
process, a database, Redis, or a secret key. Staging cannot touch production data.

### Branch → environment → database (answer "which DB does this hit?")

| You're looking at… | Frontend | `BACKEND_ORIGIN` resolves to | Backend service | Database |
|---|---|---|---|---|
| `www.spreadsheetmillionaire.com` (prod domain) | Vercel **Production** | production Render URL | production | Neon **main** branch |
| a `develop` preview URL | Vercel **Preview** | staging Render URL | staging | Neon **dev** branch |
| any feature-branch preview URL | Vercel **Preview** | staging Render URL | staging | Neon **dev** branch |
| `localhost:5173` (dev) | Vite dev proxy (no middleware) | `localhost:5000` | local Flask | local / dev DB |

> **Post-launch follow-up (known, accepted):** the Preview scope holds a single
> value, so **every** preview — `develop` *and* every feature branch — proxies to
> staging. That's intentional for now. If a feature branch ever needs its own
> isolated backend, Preview scoping has to become per-branch (Vercel supports
> branch-scoped env vars). Tracked, not a launch blocker.

---

## 1. The crux — `BACKEND_ORIGIN` set twice in Vercel

**This is the single most important step and the easiest to get wrong.** The
frontend proxies `/api/*` to whatever `BACKEND_ORIGIN` says, read at the edge by
`frontend/middleware.js`. It must be set **once per scope** in the Vercel project
(**Settings → Environment Variables**):

| Variable | Vercel scope | Value (names only) |
|---|---|---|
| `BACKEND_ORIGIN` | **Production** | the **production** Render service origin, e.g. `https://<prod-service>.onrender.com` (no trailing `/api`, no path) |
| `BACKEND_ORIGIN` | **Preview** | the **staging** Render service origin, e.g. `https://<staging-service>.onrender.com` |

Rules:
- **Origin only** — scheme + host. Not `…/api`, not a trailing slash-path. The
  middleware appends the full `/api/...` path itself.
- **Do NOT prefix it `VITE_`.** A `VITE_`-prefixed var is inlined into the client
  bundle at build; this one must stay server/edge-side so the backend URL never
  ships to the browser. (`DECISIONS.md` § "API proxy target is environment-driven".)
- If it's **unset**, the middleware returns `502` with a logged error — by
  design, so a misconfig fails loudly instead of proxying nowhere.
- After changing either scope, **redeploy** that environment for the new value to
  take effect (env vars are bound at deploy/runtime, not patched live).

---

## 2. Render — two web services

Create **two** services from the same repo. Identical settings except the tracked
branch; **separate** databases, Redis, and secret keys.

Render dashboard → **New** → **Web Service** → connect the GitHub repo, once per
service.

| Setting | Production | Staging |
|---|---|---|
| Branch | `main` | `develop` |
| Root directory | `backend` | `backend` |
| Runtime | Python 3 | Python 3 |
| Build command | `pip install -r requirements.txt` | same |
| Start command | `gunicorn --workers 2 --bind 0.0.0.0:$PORT 'app:create_app()'` | same |
| Health check path | `/api/health` | `/api/health` |
| Instance type | **paid (always-on)** at launch | Free (keepalive, § 4) |

Notes (apply to both):
- The **start command runs from the root directory** (`backend/`), so
  `app:create_app()` and all intra-backend imports resolve. Never add a
  `backend.` prefix anywhere — Flask and gunicorn both run from inside `backend/`.
- `$PORT` is injected by Render; don't hardcode a port.
- Two workers is deliberate (`DECISIONS.md` § "gunicorn with 2 workers + ProxyFix").

### Environment variables — every var × both environments

Set under each service's **Environment** tab. **Names only — never paste values
here.** The two services must **not** share the secret key, database, or Redis.

| Variable | Production | Staging | Notes |
|---|---|---|---|
| `FLASK_SECRET_KEY` | **own, unique** | **own, unique** | Generate a fresh one **per service** — never reuse across environments or from dev. `python -c "import secrets; print(secrets.token_hex(32))"` |
| `FLASK_ENV` | `production` | `production` | Both run prod-style (gunicorn, HTTPS, Talisman). |
| `DATABASE_URL` | Neon **main** branch pooled (PgBouncer) string | Neon **dev** branch pooled (PgBouncer) string | The whole point of the split — prod never points at the dev branch. |
| `REDIS_URL` | production Upstash `rediss://…` | **separate** staging Upstash `rediss://…` | Mandatory in prod — the app exits without it. Separate instances so sessions/rate-limit counters don't bleed across environments. |
| `RESEND_API_KEY` | Resend key | Resend key (may be the same account) | If omitted, email is a logged no-op (registration still succeeds). |
| `MAIL_FROM` | `noreply@spreadsheetmillionaire.com` | sender address | Only delivers to the Resend account owner until the domain is verified (§ "Known caveats"). |
| `CORS_ORIGINS` | the production frontend origin (custom domain) | the staging/preview frontend origin | Comma-separated, no wildcard. Defence-in-depth; the single-origin proxy means the happy path doesn't rely on it. |
| `SESSION_COOKIE_SECURE` | `True` | `True` | Both are HTTPS. |
| `GA4_PROPERTY_ID` | *(optional)* GA4 property id | *(optional)* | Admin **Analytics** tab. Unset → the tab shows an empty "connect GA4" state (signup KPIs still render from the DB). Needs the commented `google-analytics-data` dep uncommented. |
| `GA4_CREDENTIALS_JSON` | *(optional)* service-account JSON or key-file path | *(optional)* | Server-side only — never `VITE_`-prefixed; the key must not reach the client. Pairs with `GA4_PROPERTY_ID`. |
| `SENTRY_DSN` | Sentry **EU-region** DSN | *(optional)* — own project or unset | Gates backend error monitoring. Unset → Sentry never inits (warning in prod, no network calls). Use an EU-region DSN so event data stays in the EU. |
| `SENTRY_TRACES_SAMPLE_RATE` | *(optional)* `0.0`–`1.0` | *(optional)* | Fraction of requests carrying a performance trace. Defaults to `0.1`; set `0` for errors-only. |
| `SENTRY_ENVIRONMENT` | *(optional)* tag, e.g. `production` | *(optional)* e.g. `staging` | Tags events by environment. Defaults to `FLASK_ENV` (`production` for both services) — set explicitly to tell prod and staging apart in Sentry. |
| `SENTRY_RELEASE` | *(optional)* version/commit tag | *(optional)* | Pins an error spike to a deploy. Set to the release tag or commit SHA if you want per-deploy tracking. |
| `LOG_LEVEL` | *(optional)* `INFO` | *(optional)* | Root log threshold for the structured request log. Defaults to `INFO`; set `DEBUG` to troubleshoot, `WARNING` to quieten. |
| `LOG_FORMAT` | *(optional)* `json` | *(optional)* | Stdout log shape. Defaults to `json` in production (`FLASK_ENV=production`) and `plain` in dev; override to force either. Render captures stdout, so JSON logs are queryable there. |

**Schema — migrates automatically on every deploy.** `backend/gunicorn.conf.py`
runs the idempotent `db_init.init_db()` in the gunicorn **master, before any
worker forks or serves a request**, so each deploy brings its own schema current
with no manual step (auto-loaded because the start command runs from `backend/`;
no `-c` flag or dashboard change needed). If the migration fails, gunicorn aborts
startup — the failed deploy never serves and the previous version keeps running.
This is what closes the old "code shipped before the migration was run" gap that
free-tier Render (no Shell) made easy to hit. See `DECISIONS.md` § "Schema
migrations run on boot".

> **Manual `db_init.py` is now a fallback, not the norm.** Boot-time migration
> covers ordinary additive releases. You only run it by hand for the out-of-band
> cases: seeding a brand-new Neon branch before its first deploy, or applying a
> migration without a code deploy. Run it **locally, pointed at the target
> branch's `DATABASE_URL`** — an inline env var wins over `.env` (`load_dotenv()`
> does not override an already-set var):
> ```sh
> cd backend
> DATABASE_URL='<paste the target branch pooled URL from Render → Environment>' \
>   venv/bin/python db_init.py     # expect: "Database schema initialised (Postgres)."
> ```
> Alternatively, paste the equivalent DDL into the **Neon SQL editor** on the
> chosen branch. `db_init.py` is idempotent, so re-running is always safe.
>
> **Caveat — boot-time migration is for *additive* changes only.** Adding tables,
> columns, indexes, and rebuilding CHECKs is safe to apply while the old version
> may still be serving briefly during a rolling deploy. A *destructive* or
> rewriting change (drop/rename a column, narrow a type, backfill) is **not** —
> it can break the still-running old code and a failed run blocks all boots. Those
> need a deliberate expand/contract sequence run out-of-band, not a boot hook.

---

## 3. Vercel — one project, two scopes

Vercel dashboard → the existing project (or **Add New → Project** → import the repo
if it doesn't exist yet).

| Setting | Value |
|---|---|
| Root directory | `frontend` |
| Framework preset | Vite (auto-detected) |
| Build command | `npm run build` |
| Output directory | `dist` |
| Production branch | `main` (after launch flip; was `develop` pre-launch) |

How the proxy is wired (no dashboard rewrite config needed):
- `frontend/vercel.json` is picked up automatically and contains **only the SPA
  fallback** (`/(.*) → /index.html`) — that's what makes a hard refresh on a
  client route (e.g. `/app/calculator/fire`) serve `index.html` instead of 404.
- `frontend/middleware.js` is the Edge Middleware that intercepts `/api/*` and
  rewrites it to `${BACKEND_ORIGIN}/api/...`. It runs before the SPA fallback, so
  API calls never get rewritten to `index.html`.
- Set `BACKEND_ORIGIN` for **both** scopes — this is § 1, the crux. Don't skip it.

**Frontend env vars** — all `VITE_`-prefixed, so they're inlined into the client bundle at build time (set them in Vercel, then redeploy so the build picks them up):

| Var | Production | Preview | Notes |
|---|---|---|---|
| `VITE_SENTRY_DSN` | Sentry **EU-region** DSN (browser project) | *(optional)* own project or unset | Gates frontend error monitoring. Unset → `@sentry/react` never inits, no SDK phones home. A Sentry DSN is a public ingest key, not a secret — safe to inline (unlike the server-side GA4 credentials). Sentry is already named in `PrivacyPage.jsx`'s sub-processor list, so enabling it keeps the privacy page accurate. |
| `VITE_SENTRY_ENVIRONMENT` | *(optional)* e.g. `production` | *(optional)* e.g. `preview` | Defaults to Vite's `MODE`. Set explicitly to tell prod and preview apart in Sentry. |
| `VITE_SENTRY_TRACES_SAMPLE_RATE` | *(optional)* `0`–`1` | *(optional)* | Defaults to `0` (errors only — no performance tracing). Raise only deliberately. |
| `VITE_SENTRY_RELEASE` | *(optional)* version/commit | *(optional)* | Pins a frontend error to a deploy. |

After the frontend origins are known, set each Render service's `CORS_ORIGINS`
(§ 2) to the matching frontend origin and let Render redeploy.

---

## 4. Keepalive (free-tier cold-start mitigation — staging)

Render's **free** instance sleeps after 15 idle minutes; the next request pays a
multi-second cold start that can exceed the Vercel proxy timeout. Keep the
**staging** service warm:

- Create a job on **cron-job.org** (or any uptime pinger).
- URL: `GET https://<staging-render-url>.onrender.com/api/health`
- Interval: **every 10 minutes**.
- `/api/health` is rate-limit-exempt and does no DB/Redis work — safe to ping.

The **production** service runs on the paid always-on instance at launch, so it
never sleeps and the keepalive is optional there.

---

## 5. Launch-flip runbook (ordered — the operator follows this)

Run top to bottom. Each step depends on the ones above it. Do **not** reorder.

1. **Create the staging Render service from `develop`** (§ 2) — set all its env
   vars (own secret, dev-branch `DATABASE_URL`, staging Upstash). Confirm
   `GET /api/health` → `200`.
2. **Set Vercel `BACKEND_ORIGIN` for both scopes** (§ 1): Production → production
   Render origin, Preview → staging Render origin.
3. **Prepare the production database:** in Neon, create/confirm the production
   role and the **main** branch. Run `python db_init.py` from `backend/` **once**
   against the main-branch pooled `DATABASE_URL` (fresh prod schema; idempotent).
4. **Point production Render `DATABASE_URL`** at the Neon **main** branch pooled
   string (and confirm production Upstash + a fresh secret are set).
5. **Generate a fresh production `FLASK_SECRET_KEY`** for the production Render
   service — unique, never reused from staging/dev. Save it via Render's
   environment UI only.
6. **Flip Vercel Production Branch** `develop` → `main` (after merging `develop`
   → `main` and tagging the release — `DECISIONS.md` § "Git branching model":
   release is a **merge commit**, never a squash).
7. **Flip the production Render service's tracked branch** → `main`. Let it
   redeploy.
8. **Smoke-test production** on `www.spreadsheetmillionaire.com` (§ 6), **then**
   smoke-test a `develop` **preview** URL to confirm it hits **staging** and the
   two are isolated.

> Steps 2 and 5–7 are the ones that, done out of order or skipped, point the prod
> frontend at the wrong backend or boot prod on a stale key. The
> `BACKEND_ORIGIN` Production/Preview split (step 2) is the crux — re-read § 1.

---

## 6. Smoke-test checklist

Run this for **each** environment (production on the custom domain; staging on a
preview URL), pointed at that environment's backend.

Backend, directly on Render (bypasses Vercel):

- [ ] `curl https://<render-url>.onrender.com/api/health` → `200 {"status":"ok"}`

Then on the **frontend origin** (exercises the full single-origin path):

- [ ] **Register** a new account → `201`; welcome-email attempt is logged
      (delivery only works to the Resend account owner until the domain is
      verified — § "Known caveats").
- [ ] **Login** with the new account → `200`.
- [ ] **Save** a calculation on a published calculator (e.g. `fire`) → it appears
      in the saved list.
- [ ] **Isolation check:** an account created on **staging** must **not** exist on
      **production** (separate databases). Confirm by trying to log into prod with
      the staging account — it should fail.
- [ ] **Restart survives:** trigger a redeploy (or sleep/wake on staging), reload
      — still logged in (session in Redis). The **first mutating request after a
      restart may 403** with a stale CSRF token — known flake; a page refresh
      re-fetches the token. Don't chase it.

---

## Known caveats (carried from earlier phases)

- **Resend domain not yet verified.** Until `spreadsheetmillionaire.com` is
  verified in Resend (a DNS task), transactional email only reaches the Resend
  account owner's own address. Registration never fails on email errors.
- **Stale CSRF after a restart.** First mutating request after a backend restart
  can 403; refresh fixes it. Known, not a bug to fix here.
- **Preview scope is shared.** Every preview (not just `develop`) proxies to
  staging — see § 0's follow-up note.
