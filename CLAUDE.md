# SpreadsheetMillionaire

Personal-finance calculator web app (formerly FINtrackr). Flask API + React/Vite SPA. Anonymous users can use every calculator; authenticated users can save/load/rename/delete their inputs. Currently narrowing from 12 calculators to a 4-calculator public MVP; the remaining 8 ship later as build-in-public patches.

## Read before structural work

- `PROJECT_STRUCTURE.md` — canonical file tree, paths, conventions. Never guess at a path; check here.
- `DECISIONS.md` — the *why* behind every architectural choice, with revisit conditions. Read the relevant section before changing or working around a pattern. If a decision is wrong, say so explicitly — don't silently route around it.
- Update both files whenever a change warrants it, in the same PR as the change.

## Commands

- Backend: `cd backend && python -m app` (Flask on :5000 — must run from `backend/`)
- Frontend: `cd frontend && npm run dev` (Vite on :5173, proxies `/api/*` to :5000)
- DB schema/migrations: `cd backend && python db_init.py` (idempotent)
- Frontend build check: `cd frontend && npm run build`

## Hard rules — violating any of these is a bug

1. **Backend imports:** `from calc_types import X` — NEVER `from backend.calc_types import X`. Flask runs from inside `backend/`, so `backend.` prefixes break at runtime. Applies to all intra-backend imports.
2. **Single source of truth.** Calculator metadata → `frontend/src/calculators/registry.js`. Valid calc types (backend) → `backend/calc_types.py`. Storage keys → `frontend/src/constants.js`. Number formatting → `fmt()` in `frontend/src/utils/format.js`. Never duplicate any of these definitions; derive from the source instead.
3. **No raw `fetch` in feature modules.** All HTTP goes through `httpClient.createApi(baseUrl)` via a module in `src/api/`. CSRF injection is handled there.
4. **Every saved-data shape has `version: 1`** as its first field and a migration path in `frontend/src/utils/migrateCalcData.js`. No exceptions, including future trackers.
5. **Every query against a user-scoped table includes `AND user_id = ?`.** IDOR protection lives at the query layer. No exceptions.
6. **Paid features are gated at three layers:** UI component, API route, DB query. Gating only one or two is a security bug — flag it.
7. **Calculator components never render their own explainer.** The registry's `explainer: { heading, body }` drives `<CalculatorExplainer>` in `CalculatorPage`.
8. **Parameterised SQL only.** Raw `sqlite3` (Postgres later), never string-built queries.

## Don't add without explicit approval

TypeScript, SQLAlchemy/any ORM, Redux/Zustand/Context-for-app-state, auth providers (Clerk/Auth0), UI kits, or any major dependency. The codebase is deliberately boring and transparent — justify new dependencies against the problem size, not "industry standard."

## Git workflow

- Branches: `main` (production) ← `develop` (staging) ← `feature/*`
- Never commit directly to `main`. Feature branches branch off `develop` and merge back via PR (squash merge).
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`. One logical change per commit.
- Releases: PR `develop` → `main`, then tag (`v0.2.0`, ...).

## Known flakes (don't chase these)

- Stale CSRF token after a Flask restart: first mutating request 403s. Known issue; a page refresh re-fetches the token. Not a bug to fix mid-task.

## Working style

- Before any non-trivial change, state the plan: which files change, which are new, where each lives. Then write.
- Complete, production-ready code. No `// add your logic here`, no truncated snippets.
- When an error occurs, diagnose from the stack trace: exact file, exact line, exact fix.
