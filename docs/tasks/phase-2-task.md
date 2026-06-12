# Phase 2 — Infrastructure migration: Neon Postgres, Upstash Redis, Resend

Read `CLAUDE.md`, `PROJECT_STRUCTURE.md`, and `DECISIONS.md` in full before touching anything. Then present your plan (files changed, files added, destination paths) and wait for my approval before writing code.

## Context

The app currently runs on SQLite + filesystem sessions, which cannot survive production deployment (Render's filesystem is ephemeral; filesystem sessions break under multiple gunicorn workers). This task migrates the backend to the production stack: **Postgres on Neon** (database), **Redis on Upstash** (sessions + rate limiting), and **Resend** (transactional email). Frontend changes: **none** — if you find yourself editing anything under `frontend/`, stop and tell me why.

Existing dev data is throwaway. There is NO data migration from SQLite to Postgres — fresh schema on Neon, full stop. SQLite is retired entirely; no dual-driver support, no fallback to SQLite.

Deployment itself (Render/Vercel config) is a LATER task. Password reset is a LATER task. Do not start either.

## Part 0 — Preconditions (verify, don't assume)

1. `git status` clean, currently on `develop`, Phase 1 work is merged in (the registry has `PUBLISHED_CALCULATORS`). If not, stop.
2. `backend/.env` contains non-empty values for: `DATABASE_URL` (Neon **dev branch**, pooled connection string), `REDIS_URL` (Upstash, `rediss://`), `RESEND_API_KEY`, `MAIL_FROM`. Check presence only — NEVER print the values, never echo them in logs or commit messages. If any is missing, stop and list which.
3. Confirm `psql`-level connectivity is not required — you'll verify via the app itself in Part 7.
4. Create the working branch: `feature/infra-migration` off `develop`. All commits go here.

## Part 1 — Dependencies

`backend/requirements.txt`: add `psycopg[binary]` (psycopg 3), `redis`, `resend`. Remove nothing — `flask-session` stays (it gains a Redis backend), `sqlite3` was stdlib so there's nothing to remove. Pin major versions consistent with the file's existing style. Install into the venv and verify imports before writing code against them.

## Part 2 — Postgres migration (Neon)

### Config

`backend/config.py`:
- Read `DATABASE_URL` from env. Apply the established loud-failure posture: the app **exits at startup** with a clear message if `DATABASE_URL` is missing or doesn't start with `postgres`. Remove `DATABASE_PATH` and all SQLite path logic.
- Neon requires TLS — ensure `sslmode=require` is in the connection string or appended if absent.

### Connection handling

New file `backend/db.py`: a `get_db()` helper that opens a psycopg connection per request, stored on Flask `g`, closed on teardown via `@app.teardown_appcontext`. Per-request connections, no in-process pool — the `DATABASE_URL` points at Neon's pooled (PgBouncer) endpoint, which does the pooling. Keep it boring: one helper, one teardown, `row_factory=dict_row` so models get dicts (mirroring whatever row access pattern the current models use — read them first).

### Schema

Rewrite `backend/db_init.py` for Postgres, preserving exact semantics:
- `users`: identity PK (`GENERATED ALWAYS AS IDENTITY`), unique email, password hash, `TIMESTAMPTZ` timestamps.
- `saved_calculators`: identity PK, `user_id` FK with `ON DELETE CASCADE`, `calc_type` with a CHECK constraint built from `VALID_CALC_TYPES` — still `from calc_types import VALID_CALC_TYPES`, still the single source. The `data` column becomes `JSONB` (Postgres-native; document the choice). Keep all 12 types valid.
- Idempotent: `CREATE TABLE IF NOT EXISTS`, and the SQLite CHECK-constraint table-rebuild hack is **deleted** — Postgres alters constraints in place; replace it with a drop-and-recreate of the named CHECK constraint so adding a calc type later is still `python db_init.py`.

### Models

`backend/models/user.py` and `backend/models/calculator.py`:
- Placeholders `?` → `%s` everywhere. No f-string SQL — if you find any pre-existing, fix it and call it out.
- `cursor.lastrowid` → `RETURNING id`.
- `sqlite3.IntegrityError` (duplicate email etc.) → `psycopg.errors.UniqueViolation`; preserve the exact error behavior routes depend on (read the routes to confirm what they catch).
- JSONB round-trip: if models currently `json.dumps`/`json.loads` the data column, adapt so saved/loaded shapes are byte-for-byte equivalent from the route's perspective (psycopg auto-adapts JSONB to dicts — make sure routes still receive what they received before).
- **Every `saved_calculators` query keeps `AND user_id = %s`.** Re-verify each one after the edit; this is the rule most likely to be silently dropped in a mechanical rewrite.

## Part 3 — Sessions + rate limiting on Redis (Upstash)

- `config.py`: read `REDIS_URL`. Loud failure: in production (`FLASK_ENV=production`) the app exits if it's missing. In development, if `REDIS_URL` is set use it; if unset, fall back to filesystem sessions + `memory://` rate limiting with a single clear startup warning. (Zero-infra dev checkout stays possible; parity is one env var away.)
- Sessions: `SESSION_TYPE = "redis"`, `SESSION_REDIS = redis.from_url(REDIS_URL)`. Upstash URLs are `rediss://` (TLS) — verify the client connects with TLS without extra flags.
- Rate limiting: `RATELIMIT_STORAGE_URI = REDIS_URL` so limits actually hold across workers.
- The CSRF token lives in the server-side session — behavior must be unchanged, including `clear_session()` preserving the token across logout. Read `utils/auth_helpers.py` before assuming anything.

## Part 4 — Transactional email (Resend)

- New file `backend/services/email.py` (create the `services/` package): a `send_email(to, subject, html)` wrapper around the Resend SDK, plus the one concrete template this phase needs: `send_welcome_email(to_email)`. `MAIL_FROM` from env.
- Config: `RESEND_API_KEY` missing → email is disabled with one clear startup warning (in dev AND prod — email is not availability-critical yet; that changes when password reset lands).
- Wire-in: registration route sends the welcome email **after** the user row is committed, inside its own try/except — an email failure is logged and swallowed, registration NEVER fails or slows materially because of email. No other routes send email in this phase.
- Note in the PR description: until the spreadsheetmillionaire.com domain is verified in Resend, sends only work to the account owner's own address — that's a human/DNS task, not yours.

## Part 5 — Cleanup

- Delete dead SQLite artifacts from code: imports of `sqlite3`, `DATABASE_PATH` references, the WAL pragma if one exists.
- `.gitignore`: keep the `*.db*` lines (defense in depth), drop nothing.
- Grep the backend for `sqlite` when done — remaining hits should be zero outside of docs/history notes.

## Part 6 — Documentation (same PR)

- `PROJECT_STRUCTURE.md`: backend tree (add `db.py`, `services/email.py`; remove the `.db*` and `flask_session/` entries), and rewrite the `.env` variable table: `DATABASE_URL`, `REDIS_URL`, `RESEND_API_KEY`, `MAIL_FROM`, dev vs prod values.
- `DECISIONS.md`, in the established format (TL;DR, Decision, Why, When to revisit):
  - New: **"Postgres on Neon"** — why (ephemeral Render filesystem, real prod DB), no-ORM stance carries over to psycopg, JSONB choice, Neon branch-per-environment (dev branch in dev, main branch in prod).
  - Rewrite: **"Filesystem sessions in dev"** → its revisit condition has triggered; new section **"Redis sessions via Upstash"** covering the env-driven dev fallback.
  - New: **"Transactional email via Resend"** — why a service module, why registration never fails on email errors.
- `CLAUDE.md`: update the Commands section if `db_init.py` usage changed, and the repo-hygiene rule list if any new artifact type must never be committed.

## Part 7 — Verification

1. Backend boots from `backend/` via `python -m app` against the Neon dev branch with zero warnings other than expected ones.
2. `python db_init.py` runs twice — second run is a clean no-op (idempotency proof).
3. Full flow against Neon via curl or the running frontend: register (welcome email attempt logged), login, save a calculation on a published calculator, list, load, rename, delete, logout, login again. Account deletion cascades (verify the saved row is gone).
4. Restart Flask mid-session: the session survives (Redis), and the first mutating request 403s with the known stale-CSRF flake — page refresh fixes; don't chase it.
5. Hit the login route 6× fast: the rate limit triggers (proves Redis-backed limiter works).
6. `git diff develop... --stat` shows **zero `frontend/` changes**.
7. Commit per part, conventional messages, e.g.:
   - `chore: add psycopg, redis, resend dependencies`
   - `feat: migrate database layer from SQLite to Postgres (Neon)`
   - `feat: move sessions and rate limiting to Redis (Upstash)`
   - `feat: add Resend email service and welcome email on registration`
   - `docs: record infra migration decisions`
8. Push, open the PR into `develop` with `gh pr create`, summarising the parts and listing the manual follow-ups (Resend DNS verification, Neon prod-branch URL needed at deploy time). Do not merge — I review first.

## Guardrails

- `from calc_types import ...` — never `from backend.calc_types import ...`. Flask runs from inside `backend/`.
- Never print, log, or commit any value from `.env`. Presence checks only.
- `%s` placeholders, no f-string SQL, `AND user_id = %s` on every user-scoped query — re-verify all of them at the end, individually.
- No SQLAlchemy, no ORM, no dual SQLite/Postgres support, no connection-pool library.
- No frontend edits. No password reset. No deployment config.
- If existing code contradicts these instructions, stop and ask rather than picking silently.
