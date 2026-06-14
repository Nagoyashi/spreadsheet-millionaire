# Phase 8 (launch) — Environment-driven API proxy + launch docs

Read `CLAUDE.md`, `PROJECT_STRUCTURE.md`, and `DECISIONS.md` in full before touching anything. Then present your plan and wait for my approval before writing code.

## Context

We're flipping to a real production environment. Today there's one Render backend and one Vercel project, both serving from `develop`. We're about to: (a) point Vercel + Render production at `main`, (b) stand up a **second Render backend** that tracks `develop` for staging, and (c) point the Neon **main** branch at production.

The blocker that requires code: `frontend/vercel.json` hardcodes the backend URL in its `/api/*` rewrite. Because that file is committed and travels with the branch, production and preview deployments would both proxy to the same backend — staging frontend hitting production backend, or vice versa. We need the proxy target to come from an **environment variable** that Vercel scopes per-environment (Production vs Preview), so the same code proxies correctly in both.

This is the ONLY code change in this phase. No features, no backend logic, no calculator changes. The dashboard work (creating services, setting env vars, flipping branches, DNS) is the human operator's — your job is the proxy mechanism + docs.

## Part 0 — Preconditions

1. Clean tree, on `develop`, `v0.7.0` is on `main`. If not, stop.
2. Working branch: `feature/env-driven-proxy` off `develop`.

## Part 1 — Replace the static rewrite with env-driven routing

Vercel's static `vercel.json` rewrites **cannot read environment variables** in the `destination`. So the proxy must move to a mechanism that can. Two viable approaches — evaluate both in your plan and recommend one:

- **(A) Vercel Middleware** (`frontend/middleware.js` or `/api` edge function): reads `process.env.BACKEND_ORIGIN`, rewrites `/api/*` requests to `${BACKEND_ORIGIN}/api/*`. Keeps the SPA fallback in `vercel.json`. This is the documented Vercel-native way to do env-conditional rewrites.
- **(B) Build-time substitution**: a Vercel build step that writes `vercel.json` from a template using the env var. Simpler conceptually but writes a generated file at build — less clean.

Lean (A) unless you find a concrete reason against it. Whichever you choose:

1. The backend origin comes from a single env var — propose the name (`BACKEND_ORIGIN` or `VITE`-prefixed only if it must reach client code, which it should NOT — the proxy is server/edge-side, keep the backend URL out of the client bundle). State clearly whether the var is read at build or at the edge at request time, because that determines how Vercel scopes it.
2. The SPA fallback (`/(.*) → /index.html`) must be preserved exactly — every client route still hard-refreshes correctly.
3. **Local dev is unaffected**: Vite's dev proxy (`vite.config.js`) still handles `/api` → `localhost:5000`. The middleware only runs on Vercel. Verify the dev flow doesn't change.
4. If `BACKEND_ORIGIN` is unset, fail loudly in a comment/log rather than silently proxying nowhere — match the project's loud-failure posture.

## Part 2 — Documentation (same PR)

Update `docs/DEPLOYMENT.md` heavily — it becomes the operator's source of truth for a two-environment setup. It must now document:

1. **Two Render services**: production (tracks `main`, Neon main-branch `DATABASE_URL`, own Upstash, own `FLASK_SECRET_KEY`) and staging (tracks `develop`, Neon dev-branch `DATABASE_URL`, separate Upstash, separate secret). A table of every env var × both environments, names only.
2. **Vercel env var** `BACKEND_ORIGIN` (or chosen name) set **twice** — Production scope → production Render URL; Preview scope → staging Render URL. This is the crux; make it unmissable.
3. **The launch-flip runbook** as an ordered checklist (the operator follows this):
   - create staging Render service from `develop`
   - set Vercel `BACKEND_ORIGIN` for both Production and Preview scopes
   - create production Neon role/confirm main branch; run `db_init.py` against the main-branch URL once (fresh prod schema)
   - point production Render `DATABASE_URL` at Neon main branch
   - flip Vercel Production Branch `develop` → `main`
   - flip Render production service tracked branch → `main`
   - generate a fresh production `FLASK_SECRET_KEY`
   - smoke test on `www.spreadsheetmillionaire.com`, then on the `develop` preview
4. **Branch → environment → database** mapping table, so the "which DB does this hit" question is answerable at a glance.
5. Note the known post-launch follow-up: previews currently share whatever `BACKEND_ORIGIN`'s Preview scope points at (staging) — fine, but document it.

Also update `STATUS.md`, `PROJECT_STRUCTURE.md` (the new middleware file + the `BACKEND_ORIGIN` env var), and add a `DECISIONS.md` section: **"API proxy target is environment-driven"** — why static `vercel.json` couldn't do it, the middleware choice, and how production/preview isolation now works.

## Part 3 — Verification & PR

1. `npm run build` passes.
2. Reason through (and state in the PR) what each deployment will proxy to once the operator sets the two scopes: production `main` build → production backend; `develop` preview → staging backend; local → Vite proxy. No live infra exists yet for the second service, so this is a code+config correctness argument, not a live test — flag that the operator confirms live during the flip.
3. Backend diff empty. No calculator/registry changes.
4. Conventional commits, e.g. `feat: env-driven API proxy target via middleware`, `docs: two-environment launch runbook`.
5. Push, `gh pr create` into `develop`. The PR body leads with the operator runbook (Part 2.3) so it's copy-pasteable. Do not merge — I review, and the operator runs the dashboard steps in parallel.

## Guardrails

- One code change: the proxy mechanism. Nothing else.
- The backend URL must NOT end up in the client JS bundle — proxy is edge/server-side.
- SPA fallback preserved; local Vite dev flow unchanged.
- No new dependencies unless the middleware genuinely requires one (it shouldn't — Vercel middleware is built in).
- If approach (A) hits a real limitation, surface it and fall back to (B) rather than improvising a third thing.
