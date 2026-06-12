# Deployment runbook — staging

> Click-by-click guide to deploying SpreadsheetMillionaire to **staging**.
> Backend → **Render** (Flask under gunicorn). Frontend → **Vercel** (static
> Vite build). They share one origin via a Vercel rewrite proxy — see
> `DECISIONS.md` § "Single-origin deployment via Vercel rewrite proxy".
>
> Staging deploys from the **`develop`** branch and points at the Neon **dev**
> branch + Upstash. The launch-day flip to production (`main` + Neon main
> branch + custom domain) is the stub at the bottom — do not do it yet.

This is an ops checklist. Account creation, dashboard clicks, and DNS are
**human** tasks; the code is already in the repo. Follow it top to bottom.

---

## Order of operations (the dependency chain)

1. Create the **Render** web service → it gives you a URL like
   `https://spreadsheetmillionaire-api.onrender.com`.
2. Replace the `RENDER-URL-PLACEHOLDER` in `frontend/vercel.json` with that
   URL, commit, push (§ "Post-creation: wire the real Render URL").
3. Create the **Vercel** project → it gives you a URL like
   `https://spreadsheetmillionaire.vercel.app`.
4. Set `CORS_ORIGINS` on Render to that Vercel URL.
5. Add the **keepalive** cron job.
6. Run the **smoke test**.

You can't fill in `CORS_ORIGINS` until Vercel exists, and you can't finish
`vercel.json` until Render exists — hence the order. The placeholder commit in
step 2 is the only code change after this PR merges.

---

## 1. Render web service (backend)

Render dashboard → **New** → **Web Service** → connect the GitHub repo.

| Setting | Value |
|---|---|
| Branch | `develop` |
| Root directory | `backend` |
| Runtime | Python 3 |
| Build command | `pip install -r requirements.txt` |
| Start command | `gunicorn --workers 2 --bind 0.0.0.0:$PORT 'app:create_app()'` |
| Health check path | `/api/health` |
| Instance type | Free |

Notes:
- The **start command runs from the root directory** (`backend/`), so the
  `app:create_app()` target and all intra-backend imports resolve. Do not add a
  `backend.` prefix anywhere — Flask and gunicorn both run from inside `backend/`.
- `$PORT` is injected by Render; don't hardcode a port.
- Two workers is deliberate (see `DECISIONS.md` § "gunicorn with 2 workers + ProxyFix").

### Render environment variables

Set these under the service's **Environment** tab. **Names only below — never
paste a value into this file or any commit.**

| Variable | Notes |
|---|---|
| `FLASK_SECRET_KEY` | **Generate a NEW one for staging** — do not reuse the dev key. `python -c "import secrets; print(secrets.token_hex(32))"` |
| `FLASK_ENV` | `production` |
| `DATABASE_URL` | Neon **dev branch** pooled (PgBouncer) connection string. The Neon **main** branch is reserved for production at launch. |
| `REDIS_URL` | Upstash `rediss://…` (mandatory in production — the app exits without it). |
| `RESEND_API_KEY` | Resend API key. If omitted, email is disabled with a startup warning (registration still succeeds). |
| `MAIL_FROM` | Sender address, e.g. `noreply@spreadsheetmillionaire.com`. |
| `CORS_ORIGINS` | The Vercel URL — **fill this in after step 3.** Comma-separated; no wildcard. |
| `SESSION_COOKIE_SECURE` | `True` (staging is HTTPS). |

Schema note: the Neon dev branch already has the schema from Phase 2. If you
ever point at a fresh Neon branch, run `python db_init.py` from `backend/` once
against it (idempotent) before the first real request.

---

## 2. Post-creation: wire the real Render URL

Once Render gives you the service URL, replace the placeholder in the rewrite
config. There is exactly **one `RENDER-URL-PLACEHOLDER` to replace — in
`frontend/vercel.json`** (the API-proxy `destination`). The other matches of
that string live only in the docs (`docs/DEPLOYMENT.md`, the task prompt) and
need no change:

```jsonc
// frontend/vercel.json — before
{ "source": "/api/:path*", "destination": "https://RENDER-URL-PLACEHOLDER.onrender.com/api/:path*" }
// after (example)
{ "source": "/api/:path*", "destination": "https://spreadsheetmillionaire-api.onrender.com/api/:path*" }
```

Commit and push to `develop`:

```bash
git checkout develop && git pull
# edit frontend/vercel.json
git add frontend/vercel.json
git commit -m "chore: point Vercel rewrite at the Render staging URL"
git push
```

Vercel redeploys automatically on push (after the project exists in step 3).

---

## 3. Vercel project (frontend)

Vercel dashboard → **Add New** → **Project** → import the same repo.

| Setting | Value |
|---|---|
| Root directory | `frontend` |
| Framework preset | Vite (auto-detected) |
| Build command | `npm run build` |
| Output directory | `dist` |
| Production branch | `develop` (staging-first) |

`vercel.json` is picked up automatically from the `frontend/` root — no extra
config in the dashboard. The SPA fallback rule in it is what makes hard-refresh
on a client route (e.g. `/calculator/fire`) serve `index.html` instead of 404.

After the project exists, go back to **Render → Environment** and set
`CORS_ORIGINS` to the Vercel production URL (e.g.
`https://spreadsheetmillionaire.vercel.app`), then let Render redeploy.

---

## 4. Keepalive (free-tier cold-start mitigation)

Render's free instance **sleeps after 15 idle minutes**; the next request pays
a multi-second cold start that can exceed the Vercel rewrite timeout. Keep it
warm with an external pinger:

- Create a job on **cron-job.org** (or any uptime pinger).
- URL: `GET https://<your-render-url>.onrender.com/api/health`
- Interval: **every 10 minutes**.
- `/api/health` is rate-limit-exempt and does no DB/Redis work, so a pinger
  every 10 min is free and safe.

**Eventual fix:** the **$7/mo** Render paid instance never sleeps — switch to it
at launch and the keepalive becomes optional.

---

## 5. Smoke-test checklist

Backend, directly on Render (bypasses Vercel):

- [ ] `curl https://<render-url>.onrender.com/api/health` → `200 {"status":"ok"}`

Then on the **Vercel URL** (exercises the full single-origin path):

- [ ] **Register** a new account → `201`; welcome-email attempt is logged
      (delivery only works to the Resend account owner until the domain is
      verified — see § "Known caveats").
- [ ] **Login** with the new account → `200`.
- [ ] **Save** a calculation on a published calculator (e.g. `fire`) → it
      appears in the saved list.
- [ ] **Restart survives:** trigger a Render redeploy (or wait for a
      sleep/wake), then reload the app — you're still logged in (session lives
      in Redis). The **first mutating request after a restart may 403** with a
      stale CSRF token — this is the known flake; a page refresh re-fetches the
      token and fixes it. Don't chase it.
- [ ] **Load on a second device** (or a different browser): log in, see the
      saved calculation. Confirms the session/cookie path works first-party.

---

## Known caveats (carried from earlier phases)

- **Resend domain not yet verified.** Until `spreadsheetmillionaire.com` is
  verified in Resend (a DNS task), transactional email only reaches the Resend
  account owner's own address. Registration never fails on email errors.
- **Stale CSRF after a restart.** First mutating request after a backend
  restart can 403; refresh fixes it. Known, not a bug to fix here.

---

## Launch-day section (stub — do NOT do this for staging)

When staging is proven and it's time to go to production:

1. **Promote the branch:** change the Vercel production branch to `main` (after
   merging `develop` → `main` and tagging the release).
2. **Point at the production database:** swap Render's `DATABASE_URL` to the
   Neon **main branch** pooled string.
3. **Custom domain + Resend DNS:** add the custom domain on Vercel
   (`app.spreadsheetmillionaire.com` or apex), verify `spreadsheetmillionaire.com`
   in Resend (DNS records), and update `MAIL_FROM`/`CORS_ORIGINS` accordingly.
4. **Always-on instance:** upgrade Render to the paid instance so cold starts
   (and the keepalive) go away.

Each of these is its own short task — listed here so the path is visible, not
to be executed during the staging deploy.
