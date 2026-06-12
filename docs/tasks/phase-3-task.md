# Phase 3 — Staging deploy readiness: gunicorn, health check, Vercel proxy, deployment runbook

Read `CLAUDE.md`, `PROJECT_STRUCTURE.md`, and `DECISIONS.md` in full before touching anything. Then present your plan (files changed, files added, destination paths) and wait for my approval before writing code.

## Context

The backend is now stateless (Neon Postgres, Upstash Redis, Resend — Phase 2). This task makes the repo deployable: **Render** runs the Flask API under gunicorn, **Vercel** serves the built frontend as static files. The two run on different domains, so we adopt a **single-origin architecture**: Vercel rewrites `/api/*` to the Render backend server-side. The browser only ever talks to the Vercel origin — session cookies stay first-party (no Safari third-party-cookie breakage), there is no CORS preflight surface, and the frontend keeps calling relative `/api/...` paths exactly as it does behind the Vite dev proxy today.

The account creation, dashboard configuration, and DNS are HUMAN tasks — out of scope for you. Your job is everything in the repo, plus a runbook precise enough that the human can click through Render and Vercel without guessing. Password reset, the landing page, and calculator fixes are LATER phases.

## Part 0 — Preconditions

1. `git status` clean, on `develop`, Phase 2 merged (`backend/db.py` exists). If not, stop.
2. The Render service URL is NOT known yet (the human creates the service after your PR). Use the literal placeholder `https://RENDER-URL-PLACEHOLDER.onrender.com` wherever it's needed and flag every occurrence in the PR description. A follow-up commit will replace it.
3. Create the working branch: `feature/staging-deploy` off `develop`.

## Part 1 — gunicorn + proxy awareness

1. Add `gunicorn` to `backend/requirements.txt`, pinned in the file's existing style. Install and verify.
2. Read `backend/app.py` first and determine the correct gunicorn target for how the app object is actually exposed (factory vs module-level instance). Do not guess.
3. Render terminates TLS and proxies requests, so Flask must trust the forwarding headers or Talisman's HTTPS redirect will loop and `request.is_secure` will lie. Wrap the WSGI app with `werkzeug.middleware.proxy_fix.ProxyFix` (`x_for=1, x_proto=1, x_host=1`) — applied unconditionally; it is harmless behind the Vite dev proxy.
4. The canonical start command (to appear in the runbook): `gunicorn --workers 2 --bind 0.0.0.0:$PORT <correct-target>`, run from the `backend/` root directory. Two workers is deliberate — it is the smallest number that would expose any residual shared-state bug, and Phase 2 exists precisely so this works.
5. Verify locally: from `backend/`, run gunicorn with the documented command (use a literal port) and confirm the app boots and serves.

## Part 2 — Health endpoint

1. Add `GET /api/health` returning `200 {"status": "ok"}`. No auth, no CSRF, exempt from rate limiting (`@limiter.exempt`) — it will be hit by Render's health checks and an external keepalive pinger every few minutes.
2. Keep it trivial: no DB or Redis round-trip. It answers "is the process up", nothing more. Boring on purpose.
3. Place it wherever fits the existing route organisation best (read `routes/` first); if it warrants a tiny new blueprint, that's fine.

## Part 3 — `frontend/vercel.json`

Create `frontend/vercel.json`:

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://RENDER-URL-PLACEHOLDER.onrender.com/api/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Two rules, order matters (first match wins): the API proxy, then the SPA fallback so client-side routes like `/calculator/fire` don't 404 on hard refresh. Static assets are unaffected — Vercel serves filesystem matches before evaluating rewrites. This is the ONLY file you create under `frontend/`; no `src/` changes of any kind (the relative `/api` paths in `httpClient` are exactly why this works).

## Part 4 — Config sweep for deployability

1. Grep the backend for any hardcoded `localhost`, `127.0.0.1`, or port assumptions that would break on Render. The dev server invocation in `app.py`'s `__main__` block is fine; anything reachable in production paths is not.
2. Confirm (and fix if needed) that in production: `SESSION_COOKIE_SECURE=True`, `CORS_ORIGINS` comes from env, and nothing logs secrets at startup.
3. Do not add new env variables unless something genuinely requires it; if you do, they go in the runbook's table.

## Part 5 — `docs/DEPLOYMENT.md` runbook

Write the runbook the human will follow click-by-click. It must contain:

1. **Render web service**: connect repo; branch `develop`; root directory `backend`; runtime Python; build command `pip install -r requirements.txt`; the exact start command from Part 1; health check path `/api/health`; instance type free.
2. **Render environment variables** — a table of names only, NO values: `FLASK_SECRET_KEY` (note: generate a NEW one for staging, don't reuse the dev one), `FLASK_ENV=production`, `DATABASE_URL` (Neon **dev** branch pooled string for staging; the Neon main branch is reserved for production at launch), `REDIS_URL`, `RESEND_API_KEY`, `MAIL_FROM`, `CORS_ORIGINS` (the Vercel URL once known), plus anything Part 4 added.
3. **Vercel project**: import repo; root directory `frontend`; framework Vite (auto-detected); build `npm run build`; output `dist`; production branch `develop` (staging-first — the launch-day flip to `main` gets its own short section).
4. **Post-creation step**: replace `RENDER-URL-PLACEHOLDER` in `frontend/vercel.json` with the real Render URL, commit, push — Vercel redeploys automatically.
5. **Keepalive**: Render free tier sleeps after 15 idle minutes; document a cron-job.org job hitting `GET <render-url>/api/health` every 10 minutes as the mitigation, and note the $7/mo paid instance as the eventual fix.
6. **Smoke-test checklist**: health endpoint direct on Render; then on the Vercel URL: register → login → save → restart survives → load on a second device. Note the expected staleness: a stale CSRF after a Render restart is the known flake; refresh fixes.
7. **Launch-day section (stub)**: flip production branch to `main`, point `DATABASE_URL` at Neon main branch, custom domain + Resend DNS — listed, not elaborated.

## Part 6 — Documentation (same PR)

1. `PROJECT_STRUCTURE.md`: add `frontend/vercel.json`, `docs/DEPLOYMENT.md`, the health route, gunicorn in the requirements line.
2. `DECISIONS.md`, house format (TL;DR / Decision / Why / When to revisit):
   - New: **"Single-origin deployment via Vercel rewrite proxy"** — why (first-party cookies, Safari third-party-cookie blocking, zero CORS surface, zero frontend changes), trade-off (every API call hops through Vercel's edge; Render cold starts can exceed the rewrite timeout — mitigated by the keepalive), revisit condition (custom domains at launch make `api.spreadsheetmillionaire.com` same-site, so direct calls become viable if proxy latency ever matters).
   - New: **"gunicorn with 2 workers + ProxyFix"** — short.
3. `CLAUDE.md`: add the gunicorn command to Commands if useful.

## Part 7 — Verification & PR

1. From `backend/`: gunicorn boots with the documented command; `curl localhost:<port>/api/health` returns `200 {"status":"ok"}`; a rapid-fire loop against `/api/health` does NOT rate-limit; the normal `python -m app` dev flow still works.
2. `cd frontend && npm run build` passes; `git diff develop... --name-only | grep ^frontend/` shows exactly one file: `frontend/vercel.json`.
3. Conventional commits per part, e.g. `feat: add gunicorn and proxy-aware WSGI setup`, `feat: add health endpoint`, `feat: add Vercel rewrite config for single-origin deployment`, `docs: add deployment runbook and decisions`.
4. Push, `gh pr create` into `develop`. The PR description lists: every placeholder occurrence, and the human follow-ups in order (Render service → placeholder fix → Vercel project → CORS_ORIGINS env → keepalive). Do not merge.

## Guardrails

- `from calc_types import ...` style for all intra-backend imports; Flask and gunicorn both run from inside `backend/`.
- No frontend `src/` changes. No new pages, no password reset, no landing page, no calculator edits.
- Never print or commit env values. Names only, everywhere.
- The health endpoint stays dumb. No status dashboard, no DB pings, no version strings.
- If existing code contradicts these instructions, stop and ask.
